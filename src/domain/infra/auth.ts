import "server-only";

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { AuthServiceProvider } from "../services/authService";
import { signInDto, googleSignDto } from "../dtos/authDto";
import { DomainError } from "../decorators/global";


const MAX_AGE = 30 * 24 * 60 * 60;

type GoogleClaims = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
};

function codeOf(error: unknown): string {
  return error instanceof DomainError ? error.name : "UnknownError";
}

function namesFrom(claims: GoogleClaims): { FName: string; LName: string } {
  const [first = "", ...rest] = (claims.name ?? "").trim().split(/\s+/);

  return {
    FName: claims.given_name?.trim() || first,
    LName: claims.family_name?.trim() || rest.join(" "),
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: MAX_AGE },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        Email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = signInDto.safeParse(credentials);
        if (!parsed.success)
          throw new Error("InvalidCredentialsError");

        try {
          const user = await AuthServiceProvider.get().signIn(parsed.data);

          return {
            id: user.Id,
            email: user.Email,
            name: user.fullName,
            image: user.AvatarUrl,
            role: user.Role,
          };
        } catch (error) {
          throw new Error(codeOf(error));
        }
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: { scope: "openid email profile" },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google")
        return true;

      const claims = (profile ?? {}) as GoogleClaims;

      if (claims.email_verified === false) {
        return "/auth/sign-in?error=GoogleEmailUnverified";
      }

      const parsed = googleSignDto.safeParse({
        providerAccountId: account.providerAccountId,
        Email: claims.email,
        ...namesFrom(claims),
      });

      if (!parsed.success) {
        return "/auth/sign-in?error=GoogleProfileIncomplete";
      }

      try {
        const resolved = await AuthServiceProvider.get().signInWithGoogle(
          parsed.data
        );

        user.id = resolved.Id;
        user.email = resolved.Email;
        user.name = resolved.fullName;
        user.role = resolved.Role;

        return true;
      } catch (error) {
        return `/auth/sign-in?error=${encodeURIComponent(codeOf(error))}`;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};
