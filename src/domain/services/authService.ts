import "server-only";

import bcrypt from "bcryptjs";

import { Service, Transactional } from "../decorators/service";
import { provide } from "../decorators/provider";
import {
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidTokenError,
  ValidationError,
} from "../decorators/global";
import { MailServiceProvider, MailService } from "./mailService";
import { VerifyEmailMail, ResetPasswordMail } from "../mails/authMails";
import type { UserModel } from "../models/userModel";
import { AuthProvider } from "../../../generated/prisma/client";
import { UserRepositoryProvider, UserRepository } from "../repositories/userRepository";
import { TokenRepositoryProvider, TokenRepository } from "../repositories/tokenRepository";



const BCRYPT_ROUNDS = 12;

/** A bcrypt hash of a value nobody knows, used to keep timing uniform. */
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.yqDMzHNwEmqA5RGeBaqiKUcMwzeIYbq";

/**
 * Business rules for the auth flows.
 *
 * Repositories arrive as constructor defaults resolved from providers, so a
 * test can pass stubs positionally or override the provider before the service
 * is built. No container, and the dependencies stay visible in the signature.
 */
@Service({ name: "AuthService" })
export class AuthService {
  constructor(
    private readonly users: UserRepository = UserRepositoryProvider.get(),
    private readonly tokens: TokenRepository = TokenRepositoryProvider.get(),
    private readonly mail: MailService = MailServiceProvider.get()
  ) {}

  /**
   * Creates a credentials account and issues a verification token.
   *
   * Transactional because the user row and its token must land together — a
   * failure between them leaves an account nobody can verify, on an address
   * that is now taken.
   */
  @Transactional()
  async signUp(input: {
    FName: string;
    LName: string;
    Email: string;
    password: string;
  }): Promise<UserModel> {
    const existing = await this.users.findByEmail(input.Email);
    if (existing) {
      throw new ValidationError("An account with that email already exists");
    }

    const user = await this.users.create({
      FName: input.FName,
      LName: input.LName,
      Email: input.Email,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    });

    const { raw } = await this.tokens.issueEmailVerification(user.Id);
    // Quietly: the account exists either way, and signing in re-sends the link.
    await this.mail.sendQuietly(new VerifyEmailMail(user.Email, user.FName, raw));

    return user;
  }

  /**
   * Verifies credentials.
   *
   * An unverified account re-issues its verification token and is refused with
   * `EmailNotVerifiedError` — but only after the password checks out, so this
   * cannot be used to discover which addresses are registered.
   */
  async signIn(input: { Email: string; password: string }): Promise<UserModel> {
    const user = await this.users.findByEmail(input.Email);

    // Always run a compare, even with no user. Returning early would make a
    // missing account measurably faster than a wrong password and leak which
    // addresses exist through timing alone.
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const passwordOk = await bcrypt.compare(input.password, hash);

    if (!user?.hasPassword || !passwordOk) {
      throw new InvalidCredentialsError();
    }

    if (!user.isVerified) {
      const { raw } = await this.tokens.issueEmailVerification(user.Id);
      await this.mail.sendQuietly(
        new VerifyEmailMail(user.Email, user.FName, raw)
      );
      throw new EmailNotVerifiedError(
        "Your email is not verified. We have sent a new confirmation link."
      );
    }

    return user;
  }

  /**
   * Resolves a Google sign-in, creating or linking as needed.
   *
   * Three cases, and the third is the one that bites: an address that already
   * has a credentials account. Linking silently would let anyone able to obtain
   * a Google token for that address take it over, so the link is only made when
   * the local address is already verified.
   */
  @Transactional()
  async signInWithGoogle(profile: {
    providerAccountId: string;
    Email: string;
    FName: string;
    LName: string;
  }): Promise<UserModel> {
    const linked = await this.users.findByOAuthAccount(
      AuthProvider.GOOGLE,
      profile.providerAccountId
    );
    if (linked) return linked;

    const byEmail = await this.users.findByEmail(profile.Email);
    if (byEmail) {
      if (!byEmail.isVerified) {
        throw new ValidationError(
          "An unverified account already uses this email. Verify it before linking Google."
        );
      }
      await this.users.linkOAuthAccount({
        userId: byEmail.Id,
        provider: AuthProvider.GOOGLE,
        providerAccountId: profile.providerAccountId,
      });
      return byEmail;
    }

    // Google has already proven the address, so the account starts verified
    // and with no password — `hasPassword` is false for it.
    const created = await this.users.create({
      FName: profile.FName,
      LName: profile.LName,
      Email: profile.Email,
      passwordHash: null,
      emailVerifiedAt: new Date(),
    });

    await this.users.linkOAuthAccount({
      userId: created.Id,
      provider: AuthProvider.GOOGLE,
      providerAccountId: profile.providerAccountId,
    });

    return created;
  }

  @Transactional()
  async verifyEmail(token: string): Promise<void> {
    const userId = await this.tokens.consumeEmailVerification(token);
    if (!userId) throw new InvalidTokenError();
    await this.users.markEmailVerified(userId);
  }

  /**
   * Starts a password reset.
   *
   * Returns nothing whether or not the address exists, so the endpoint can
   * answer identically either way and cannot be used to enumerate accounts.
   * Google-only accounts are skipped: issuing a reset for one would let anyone
   * who knows the address set a password on it and bypass Google entirely.
   */
  @Transactional()
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user?.hasPassword) return;

    const { raw } = await this.tokens.issuePasswordReset(user.Id);
    // Not quietly: if this fails the user is stranded with no way to recover,
    // so the error must surface rather than be swallowed into a 200.
    await this.mail.send(new ResetPasswordMail(user.Email, user.FName, raw));
  }

  @Transactional()
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.tokens.consumePasswordReset(token);
    if (!userId) throw new InvalidTokenError();

    await this.users.setPasswordHash(
      userId,
      await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    );
  }
}

export const AuthServiceProvider = provide("AuthService", () => new AuthService());
