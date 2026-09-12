import { NextRequest, NextResponse } from "next/server";
import { accessCookieName, accessRole } from "../../../../lib/site-access";

const tables = new Set(["runners", "runs", "attendance", "admins", "race_results", "upcoming_runs", "upcoming_run_volunteers"]);

async function write(request: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  if (accessRole(request.cookies.get(accessCookieName)?.value) !== "admin") {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }
  const { table } = await params;
  if (!tables.has(table)) return NextResponse.json({ error: "Unknown table." }, { status: 404 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  try {
    const response = await fetch(`${url}/rest/v1/${table}${request.nextUrl.search}`, {
      method: request.method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: request.headers.get("prefer") ?? "return=minimal",
      },
      body: request.method === "DELETE" ? undefined : await request.text(),
      cache: "no-store",
    });
    return new NextResponse(response.status === 204 ? null : await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Could not save changes. Please try again." }, { status: 502 });
  }
}

export const POST = write;
export const PATCH = write;
export const DELETE = write;
