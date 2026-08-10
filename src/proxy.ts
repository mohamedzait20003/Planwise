import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/client/dashboard", req.url));
    }

    if (pathname.startsWith("/client") && token.role !== "USER") {
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
