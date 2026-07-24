import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/profiles/(.*)",
  "/posts/(.*)",
  "/communities/(.*)",
  "/jobs(.*)",
  "/events(.*)",
  "/api/profiles/(.*)",
  "/api/jobs(.*)",
  "/api/events(.*)",
  "/api/posts/(.*)",
  "/api/communities/(.*)",
  "/api/waitlist(.*)",
  "/api/prayer-times(.*)",
  "/api/health(.*)",
  "/api/payments/webhook(.*)",
  "/api/payments/verify(.*)",
]);

const isProtectedRoute = createRouteMatcher([
  "/feed(.*)",
  "/messages(.*)",
  "/notifications(.*)",
  "/settings(.*)",
  "/mentorship(.*)",
  "/discover(.*)",
  "/dashboard(.*)",
  "/profile(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  if (isProtectedRoute(request) && !userId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (userId && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
