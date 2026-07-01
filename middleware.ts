import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const url = req.nextUrl;
  const isLoginRoute = url.pathname.startsWith("/login");

  if (!isLoggedIn && !isLoginRoute) {
    return Response.redirect(new URL("/login", url));
  }

  if (isLoggedIn && isLoginRoute) {
    return Response.redirect(new URL("/today", url));
  }
});

/**
 * Exclude /api/* entirely — the Auth.js handler needs to run without our
 * middleware wrapping it, and none of the app's other API routes need
 * auth-gating at this layer (server actions do their own session checks).
 * Also exclude static assets and the manifest so they can be fetched
 * unauthenticated for PWA install.
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)",
  ],
};
