import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const url = req.nextUrl;

  const isAuthRoute = url.pathname.startsWith("/api/auth");
  const isLoginRoute = url.pathname.startsWith("/login");

  if (isAuthRoute) return;

  if (!isLoggedIn && !isLoginRoute) {
    const loginUrl = new URL("/login", url);
    return Response.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginRoute) {
    return Response.redirect(new URL("/today", url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)"],
};
