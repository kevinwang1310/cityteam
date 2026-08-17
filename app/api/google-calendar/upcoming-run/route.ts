import { createSign } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type CalendarAction = "upsert" | "delete";

type CalendarRun = {
  id: string;
  date: string;
  title: string;
};

const calendarId =
  process.env.GOOGLE_CALENDAR_ID ??
  "47be234f69aaa3b1aebc1cbef957fc1ca345920bb79c00dd9a354a8c6b2d788a@group.calendar.google.com";
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const serviceAccountPrivateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const calendarScope = "https://www.googleapis.com/auth/calendar.events";
const tokenUrl = "https://oauth2.googleapis.com/token";

function isConfigured() {
  return Boolean(calendarId && serviceAccountEmail && serviceAccountPrivateKey);
}

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signServiceAccountJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: "RS256", typ: "JWT" });
  const claim = base64UrlJson({
    iss: serviceAccountEmail,
    scope: calendarScope,
    aud: tokenUrl,
    exp: now + 60 * 60,
    iat: now,
  });
  const unsignedToken = `${header}.${claim}`;
  const signature = createSign("RSA-SHA256").update(unsignedToken).sign(serviceAccountPrivateKey).toString("base64url");

  return `${unsignedToken}.${signature}`;
}

async function getAccessToken() {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signServiceAccountJwt(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error("Google token response did not include an access token.");
  }
  return payload.access_token;
}

function nextDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + 1));
  return value.toISOString().slice(0, 10);
}

function calendarEventForRun(run: CalendarRun) {
  return {
    summary: run.title,
    description: `CityTeam Run Club upcoming run.\n\nRun ID: ${run.id}`,
    start: { date: run.date },
    end: { date: nextDate(run.date) },
    transparency: "transparent",
    extendedProperties: {
      private: {
        cityteamUpcomingRunId: run.id,
      },
    },
  };
}

async function googleCalendarRequest(path: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Google Calendar request failed with ${response.status}`);
  }

  return response;
}

async function findExistingCalendarEventIds(runId: string, accessToken: string) {
  const params = new URLSearchParams({
    privateExtendedProperty: `cityteamUpcomingRunId=${runId}`,
    showDeleted: "false",
    maxResults: "10",
  });
  const response = await googleCalendarRequest(
    `calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    accessToken,
  );
  const payload = (await response.json()) as { items?: Array<{ id?: string }> };
  return (payload.items ?? []).map((item) => item.id).filter((id): id is string => Boolean(id));
}

async function upsertCalendarEvent(run: CalendarRun, accessToken: string) {
  const existingIds = await findExistingCalendarEventIds(run.id, accessToken);
  const eventBody = JSON.stringify(calendarEventForRun(run));

  if (existingIds[0]) {
    await googleCalendarRequest(
      `calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existingIds[0])}`,
      accessToken,
      { method: "PATCH", body: eventBody },
    );
    return;
  }

  await googleCalendarRequest(`calendars/${encodeURIComponent(calendarId)}/events`, accessToken, {
    method: "POST",
    body: eventBody,
  });
}

async function deleteCalendarEvents(runId: string, accessToken: string) {
  const existingIds = await findExistingCalendarEventIds(runId, accessToken);

  await Promise.all(
    existingIds.map((eventId) =>
      googleCalendarRequest(
        `calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        accessToken,
        { method: "DELETE" },
      ),
    ),
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { action?: CalendarAction; run?: CalendarRun };

  if (!body.run?.id || !body.run.date || !body.run.title || !body.action) {
    return NextResponse.json({ ok: false, error: "Missing run calendar sync payload." }, { status: 400 });
  }

  if (body.action !== "upsert" && body.action !== "delete") {
    return NextResponse.json({ ok: false, error: "Unsupported calendar sync action." }, { status: 400 });
  }

  if (!isConfigured()) {
    return NextResponse.json({ ok: true, configured: false });
  }

  try {
    const accessToken = await getAccessToken();
    if (body.action === "delete") {
      await deleteCalendarEvents(body.run.id, accessToken);
    } else {
      await upsertCalendarEvent(body.run, accessToken);
    }

    return NextResponse.json({ ok: true, configured: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, configured: true, error: error instanceof Error ? error.message : "Calendar sync failed." },
      { status: 502 },
    );
  }
}
