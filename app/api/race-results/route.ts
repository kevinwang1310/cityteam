import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RaceResultPayload = {
  id?: string;
  runnerId?: string;
  runId?: string;
  finishSeconds?: number;
  recordedBy?: string;
};

type SupabaseRaceResultRow = {
  id: string;
  runner_id: string;
  run_id: string;
  finish_seconds: number;
  recorded_by: string | null;
};

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function hasServerSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);
}

function fromRaceResultRow(row: SupabaseRaceResultRow) {
  return {
    id: row.id,
    runnerId: row.runner_id,
    runId: row.run_id,
    finishSeconds: row.finish_seconds,
    recordedBy: row.recorded_by ?? undefined,
  };
}

function toRaceResultRow(result: Required<Pick<RaceResultPayload, "id" | "runnerId" | "runId" | "finishSeconds">> & Pick<RaceResultPayload, "recordedBy">): SupabaseRaceResultRow {
  return {
    id: result.id,
    runner_id: result.runnerId,
    run_id: result.runId,
    finish_seconds: result.finishSeconds,
    recorded_by: result.recordedBy || null,
  };
}

async function supabaseServerRequest<T>(path: string, init: RequestInit & { prefer?: string } = {}) {
  if (!hasServerSupabaseConfig()) {
    throw new Error("Supabase service role key is not configured.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed with ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function GET() {
  if (!hasServerSupabaseConfig()) {
    return NextResponse.json({ ok: true, configured: false, results: [] });
  }

  try {
    const rows = await supabaseServerRequest<SupabaseRaceResultRow[]>("race_results?select=*&order=created_at.asc");
    return NextResponse.json({ ok: true, configured: true, results: rows.map(fromRaceResultRow) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, configured: true, error: error instanceof Error ? error.message : "Could not load race results." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!hasServerSupabaseConfig()) {
    return NextResponse.json(
      { ok: false, configured: false, error: "Supabase service role key is not configured." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as RaceResultPayload;
  if (
    !body.id ||
    !body.runnerId ||
    !body.runId ||
    typeof body.finishSeconds !== "number" ||
    !Number.isFinite(body.finishSeconds) ||
    body.finishSeconds < 0
  ) {
    return NextResponse.json({ ok: false, error: "Missing race result fields." }, { status: 400 });
  }

  try {
    const rows = await supabaseServerRequest<SupabaseRaceResultRow[]>("race_results?on_conflict=runner_id,run_id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: JSON.stringify(toRaceResultRow({
        id: body.id,
        runnerId: body.runnerId,
        runId: body.runId,
        finishSeconds: Math.round(body.finishSeconds),
        recordedBy: body.recordedBy,
      })),
    });
    return NextResponse.json({ ok: true, configured: true, result: fromRaceResultRow(rows[0]) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, configured: true, error: error instanceof Error ? error.message : "Could not save race result." },
      { status: 500 },
    );
  }
}
