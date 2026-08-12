import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const { pathname, search } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) {
      const url = new URL("/auth/sign-in", req.url);
      url.searchParams.set("callbackUrl", pathname + search);
      return NextResponse.redirect(url);
    }

    const role = token.role ?? "USER";

    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/client/dashboard", req.url));
    }

    if (pathname.startsWith("/client") && role !== "USER") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }

    return NextResponse.next();
  },
  { callbacks: { authorized: () => true } }
);

export const config = {
  matcher: [
    "/client/:path*",
    "/admin/:path*",
  ],
};
