import "server-only";

import type { ZodType } from "zod";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

import {
    DomainError,
    EmailNotVerifiedError,
    InvalidCredentialsError,
    InvalidTokenError,
    NotFoundError,
    PeriodLockedError,
    UniqueConstraintError,
    ReferenceConstraintError,
    ValidationError,
    type ErrorClass,
} from "./global";
import { resolveAll, type Provider } from "./provider";

/**
 * Endpoint composition for App Router route handlers.
 *
 * The original idea was `@POST() @Response() function signUp() {}`. That is a
 * syntax error — TypeScript rejects it with TS1206 ("Decorators are not valid
 * here") because decorators only attach to classes and class members, in both
 * legacy and stage-3. Function decorators have never shipped in TC39.
 *
 * The functional equivalent is composition: each concern is a higher-order
 * function, and they stack in the same top-to-bottom read order.
 *
 *   export const POST = Endpoint<SignUpDto, Deps>(
 *     Auth(Role.ADMIN),            // 401/403 before anything else runs
 *     Body(signUpDto),             // zod schema in, ctx.body typed out
 *     Require({ authService }),    // providers resolved onto ctx.deps
 *     async ({ body, deps }) => ({
 *       message: "Account created",
 *       data: await deps.authService.signUp(body),
 *     }),
 *   );
 *
 * Steps run in the order written and may abort by throwing; the last argument
 * is always the handler. There is no `POST()` step — the App Router derives the
 * HTTP method from the export name, so a marker naming it again could only ever
 * disagree with it.
 *
 * Reading order below: context shape, response envelope, error mapping, the
 * steps, then `Endpoint` itself.
 */

/* ------------------------------------------------------------ request context */

export type AuthUser = {
    id: string;
    email: string;
    role: string;
};

export type Ctx<Body = undefined, Deps = Record<string, never>> = {
    req: Request;
    params: Record<string, string>;
    query: URLSearchParams;

    /** Set by `Auth()`; null on public endpoints. */
    user: AuthUser | null;

    /** Set by `Body()`; `undefined` when no validator ran. */
    body: Body;

    /** Set by `Require()`; the resolved services this endpoint declared. */
    deps: Deps;
};

type MutableCtx = {
    req: Request;
    params: Record<string, string>;
    query: URLSearchParams;
    user: AuthUser | null;
    body: unknown;
    deps: Record<string, unknown>;
};

/** A step that may enrich the context or throw to abort the request. */
export type Step = (ctx: MutableCtx) => Promise<void> | void;

/**
 * Every JSON response is `{ message, data }`, with `data` omitted when there is
 * nothing to carry — so a client can always read `.message` without checking
 * which endpoint answered, and never has to distinguish `data: null` from
 * "this endpoint returns no payload".
 *
 * Errors use the same envelope plus an `error` field naming the class, giving
 * clients something stable to branch on when the wording changes.
 */
export type EndpointResult<T = unknown> = {
    message: string;
    data?: T;
    status?: number;
};

/** Drops `data` when absent. `null` counts as absent; `[]` and `0` do not. */
function envelope(message: string, data: unknown) {
    return data === undefined || data === null ? { message } : { message, data };
}

type HandlerReturn = EndpointResult | Response | void;

// `Promise<unknown> | unknown` collapses to plain `unknown`, so the old union
// said nothing. The result is awaited either way.
export type Handler<Body, Deps> = (
    ctx: Ctx<Body, Deps>
) => HandlerReturn | Promise<HandlerReturn>;

/*  HTTP-layer errors */

export class HttpError extends DomainError {
    constructor(
        readonly status: number,
        message: string,
        cause?: unknown
    ) {
        super(message, cause);
    }
}

export class BadRequestError extends HttpError {
    constructor(message = "Invalid request", cause?: unknown) {
        super(400, message, cause);
    }
}

export class UnauthorizedError extends HttpError {
    constructor(message = "Authentication required") {
        super(401, message);
    }
}

export class ForbiddenError extends HttpError {
    constructor(message = "Not permitted") {
        super(403, message);
    }
}

/**
 * Maps a thrown error to an HTTP status.
 *
 * Register app-specific errors here rather than at the throw site, e.g.
 * `mapStatus(MyError, 409)`. The domain errors below are already registered.
*/
const STATUS = new Map<ErrorClass, number>([
    [ValidationError, 400],
    [InvalidTokenError, 400],
    [InvalidCredentialsError, 401],
    [EmailNotVerifiedError, 403],
    [NotFoundError, 404],
    [UniqueConstraintError, 409],
    [ReferenceConstraintError, 409],
    [PeriodLockedError, 423],
]);

export function mapStatus(errorClass: ErrorClass, status: number): void {
    STATUS.set(errorClass, status);
}

function statusFor(error: unknown): number {
    if (error instanceof HttpError) return error.status;

    for (const [ctor, status] of STATUS) {
        if (error instanceof ctor) return status;
    }

    // A DomainError is a rule the caller broke; anything else is our bug.
    return error instanceof DomainError ? 400 : 500;
}

/* steps */

/**
 * Reads the caller from the next-auth JWT.
 *
 * There is no session table: next-auth runs the JWT strategy (which is also
 * what `proxy.ts` assumes via `req.nextauth.token`), so the session is a signed
 * cookie and `getToken` verifies it without a database round trip. That means
 * `Auth()` costs nothing per request — but it also means a token stays valid
 * until it expires, so sign-out is client-side and there is no server-side
 * revocation. Add a token version column on User if revocation is ever needed.
*/
export async function currentUser(req: Request): Promise<AuthUser | null> {
    const token = await getToken({
        req: req as Parameters<typeof getToken>[0]["req"],
        secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) return null;

    const id = (token.id ?? token.sub) as string | undefined;
    if (!id) return null;

    return {
        id,
        email: (token.email as string | undefined) ?? "",
        role: (token.role as string | undefined) ?? "USER",
    };
}

/**
 * Requires a signed-in user; with roles, requires one of them.
 *
 *   Auth()                → any authenticated user
 *   Auth(Role.ADMIN)      → admins only
 *   Auth("ADMIN", "USER") → either
 *
 * `proxy.ts` already redirects unauthenticated *page* requests. This is the
 * check that matters for the API, where the answer must be a 401 rather than a
 * redirect, and where hiding a button proves nothing.
 */
export function Auth(...roles: string[]): Step {
    return async (ctx) => {
        const user = await currentUser(ctx.req);
        if (!user) throw new UnauthorizedError();

        if (roles.length > 0 && !roles.includes(user.role)) {
            throw new ForbiddenError(`Requires role: ${roles.join(" or ")}`);
        }

        ctx.user = user;
    };
}

/**
 * Declares the services this endpoint uses and resolves them onto `ctx.deps`.
 *
 *   Require({ authService: AuthServiceProvider })
 *   async ({ body, deps }) => deps.authService.signUp(body)
 *
 * Reaching for the module singleton directly would also work — the reason to
 * go through `Require` is that a `Provider` can be overridden, so a test can
 * swap in a stub without touching the route or reaching for module mocking.
 * Resolution happens per request, so an override applied in a test's `beforeEach`
 * is picked up rather than baked in at import time.
 */
export function Require<P extends Record<string, Provider<unknown>>>(
    providers: P
): Step {
    return (ctx) => {
        Object.assign(ctx.deps, resolveAll(providers));
    };
}

/**
 * Validates the JSON body against a Zod schema and puts the parsed result on
 * `ctx.body`.
 *
 * The schema is the DTO — `z.infer` gives the type, so there is no second
 * hand-written interface to drift out of sync with the validation. Note that
 * `ctx.body` receives the schema's *output*, so transforms such as `.trim()`
 * and `.toLowerCase()` have already been applied by the time the handler runs.
 */
export function Body<T>(schema: ZodType<T>): Step {
    return async (ctx) => {
        let raw: unknown;
        try {
            raw = await ctx.req.json();
        } catch (cause) {
            throw new BadRequestError("Body must be valid JSON", cause);
        }

        const result = schema.safeParse(raw);
        if (!result.success) {
            const [issue] = result.error.issues;
            const path = issue.path.join(".");
            throw new BadRequestError(
                path ? `${path}: ${issue.message}` : issue.message
            );
        }

        ctx.body = result.data;
    };
}

/* ---------------------------------------------------------------- Endpoint */

type RouteContext = { params?: Promise<Record<string, string | string[]>> };

/**
 * Builds an App Router handler from a list of steps followed by the handler.
 *
 * Error mapping is always on and cannot be opted out of — an endpoint that
 * forgets it answers a broken lock check with an opaque 500 and an empty body.
 * Return a `Response` directly (CSV export, redirects) and it passes through
 * untouched; return a value and it is JSON-encoded; return nothing for a 204.
*/
export function Endpoint<B = undefined, D = Record<string, never>>(
    ...steps: [...Step[], Handler<B, D>]
): (req: Request, context?: RouteContext) => Promise<Response> {
    const handler = steps.at(-1) as Handler<B, D>;
    const before = steps.slice(0, -1) as Step[];

    return async function route(req: Request, context?: RouteContext) {
        try {
            const awaited = (await context?.params) ?? {};
            const params: Record<string, string> = {};
            for (const [key, value] of Object.entries(awaited)) {
                params[key] = Array.isArray(value) ? value.join("/") : value;
            }

            const ctx: MutableCtx = {
                req,
                params,
                query: new URL(req.url).searchParams,
                user: null,
                body: undefined,
                deps: {},
            };

            for (const step of before) await step(ctx);

            // `ctx` is only fully typed once the steps have run — `Require` fills
            // `deps`, `Body` fills `body`. The cast is the seam between the untyped
            // accumulation above and the typed handler below.
            const result = await handler(ctx as unknown as Ctx<B, D>);

            // Raw Response wins outright — CSV export and redirects need it.
            if (result instanceof Response) return result;
            if (result === undefined || result === null) {
                return new NextResponse(null, { status: 204 });
            }

            const { message, data, status = 200 } = result as EndpointResult;
            return NextResponse.json(envelope(message, data), { status });
        } catch (error) {
            const status = statusFor(error);

            // Never echo an unexpected error outward — the message can carry SQL,
            // file paths or column names. Log it, answer generically.
            if (status >= 500) {
                console.error("[endpoint] unhandled error", error);
                return NextResponse.json(
                    { message: "Something went wrong", error: "InternalServerError" },
                    { status }
                );
            }

            return NextResponse.json(
                { message: (error as Error).message, error: (error as Error).name },
                { status }
            );
        }
    };
}
