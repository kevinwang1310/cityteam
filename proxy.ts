import { NextRequest, NextResponse } from "next/server";

const accessCookieName = "cityteam_run_club_access";
const accessToken = process.env.SITE_ACCESS_TOKEN ?? "cityteam-run-club-access-v1";

export function proxy(request: NextRequest) {
  const hasAccess = request.cookies.get(accessCookieName)?.value === accessToken;
  if (hasAccess) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/site-login|login|favicon.svg|manifest.webmanifest|cityteamlogo.svg|file.svg|globe.svg|window.svg).*)",
  ],
};
