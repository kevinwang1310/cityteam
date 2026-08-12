import { NextRequest, NextResponse } from "next/server";

const sitePassword = process.env.SITE_PASSWORD ?? "runningwithpurpose";
const accessCookieName = "cityteam_run_club_access";
const accessToken = process.env.SITE_ACCESS_TOKEN ?? "cityteam-run-club-access-v1";

function safeRedirectPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = formData.get("password");
  const nextPath = safeRedirectPath(formData.get("next"));

  if (password !== sitePassword) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "1");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl, 303);
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  response.cookies.set(accessCookieName, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
