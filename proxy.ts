import { NextRequest, NextResponse } from "next/server";

import { accessCookieName, accessRole } from "./lib/site-access";

export function proxy(request: NextRequest) {
  const role = accessRole(request.cookies.get(accessCookieName)?.value);
  if (role) {
    if (role === "viewer" && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      return NextResponse.json({ error: "This login is view only." }, { status: 403 });
    }
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/site-login|login|favicon.svg|manifest.webmanifest|cityteamlogo.svg|file.svg|globe.svg|window.svg).*)",
  ],
};
