import { createHmac, timingSafeEqual } from "node:crypto";

export const accessCookieName = "cityteam_run_club_access";
export type AccessRole = "admin" | "viewer";

export function adminPassword() {
  return process.env.SITE_PASSWORD ?? "runningwithpurpose";
}

export function accessToken(role: AccessRole) {
  const secret = process.env.SITE_ACCESS_TOKEN ?? adminPassword();
  return createHmac("sha256", secret).update(`cityteam-session-v2:${role}`).digest("hex");
}

export function accessRole(token?: string): AccessRole | null {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  for (const role of ["admin", "viewer"] as const) {
    if (timingSafeEqual(Buffer.from(token), Buffer.from(accessToken(role)))) return role;
  }
  return null;
}
