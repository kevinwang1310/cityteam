import { createSign } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type CalendarAction = "upsert" | "delete" | "reconcile";

type CalendarRun = {
  id: string;
  date: string;
  title: string;
  startTime?: string;
  endTime?: string;
  location?: string;
};

type GoogleCalendarEvent = {
  id?: string;
  summary?: string;
  location?: string;
  start?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  extendedProperties?: {
    private?: {
      cityteamUpcomingRunId?: string;
    };
  };
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
    const errorText = await response.text().catch(() => "");
    throw new Error(`Google token request failed with ${response.status}${errorText ? `: ${errorText}` : ""}`);
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

function isTimeValue(value: string | undefined) {
  return Boolean(value && /^\d{2}:\d{2}$/.test(value));
}

function hasValidTimeRange(run: Pick<CalendarRun, "startTime" | "endTime">) {
  if (!run.startTime && !run.endTime) return true;
  if (!isTimeValue(run.startTime) || !isTimeValue(run.endTime)) return false;
  const { startTime, endTime } = run as { startTime: string; endTime: string };
  return endTime > startTime;
}

function calendarEventForRun(run: CalendarRun) {
  const hasTimes = isTimeValue(run.startTime) && isTimeValue(run.endTime);

  return {
    summary: run.title,
    description: `CityTeam Run Club upcoming run.\n\nRun ID: ${run.id}`,
    location: run.location?.trim() || undefined,
    start: hasTimes
      ? { dateTime: `${run.date}T${run.startTime}:00`, timeZone: "America/Los_Angeles" }
      : { date: run.date },
    end: hasTimes
      ? { dateTime: `${run.date}T${run.endTime}:00`, timeZone: "America/Los_Angeles" }
      : { date: nextDate(run.date) },
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
    const errorText = await response.text().catch(() => "");
    throw new Error(`Google Calendar request failed with ${response.status}${errorText ? `: ${errorText}` : ""}`);
  }

  return response;
}

function datePartFromCalendarDateTime(value: string | undefined) {
  return value?.slice(0, 10);
}

function timePartFromCalendarDateTime(value: string | undefined) {
  return value?.slice(11, 16);
}

function calendarRunFromEvent(fallbackRun: CalendarRun, event: GoogleCalendarEvent): CalendarRun {
  const date = event.start?.date ?? datePartFromCalendarDateTime(event.start?.dateTime) ?? fallbackRun.date;
  const startTime = timePartFromCalendarDateTime(event.start?.dateTime);
  const endTime = timePartFromCalendarDateTime(event.end?.dateTime);

  return {
    ...fallbackRun,
    date,
    title: event.summary?.trim() || fallbackRun.title,
    startTime,
    endTime,
    location: event.location?.trim() || undefined,
  };
}

async function findExistingCalendarEvents(runId: string, accessToken: string) {
  const params = new URLSearchParams({
    privateExtendedProperty: `cityteamUpcomingRunId=${runId}`,
    showDeleted: "false",
    maxResults: "10",
  });
  const response = await googleCalendarRequest(
    `calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    accessToken,
  );
  const payload = (await response.json()) as { items?: GoogleCalendarEvent[] };
  return payload.items ?? [];
}

async function findExistingCalendarEventIds(runId: string, accessToken: string) {
  const events = await findExistingCalendarEvents(runId, accessToken);
  return events.map((item) => item.id).filter((id): id is string => Boolean(id));
}

async function listCalendarEventsForRuns(runs: CalendarRun[], accessToken: string) {
  const sortedRuns = runs.slice().sort((a, b) => a.date.localeCompare(b.date));
  const firstRun = sortedRuns[0];
  const lastRun = sortedRuns[sortedRuns.length - 1];
  if (!firstRun || !lastRun) return [];

  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      timeMin: `${firstRun.date}T00:00:00-07:00`,
      timeMax: `${nextDate(lastRun.date)}T23:59:59-07:00`,
      singleEvents: "true",
      showDeleted: "false",
      maxResults: "2500",
    });
    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await googleCalendarRequest(
      `calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      accessToken,
    );
    const payload = (await response.json()) as { items?: GoogleCalendarEvent[]; nextPageToken?: string };
    events.push(...(payload.items ?? []));
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return events;
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
  const body = (await request.json()) as { action?: CalendarAction; run?: CalendarRun; runs?: CalendarRun[] };

  if (body.action === "reconcile") {
    if (!Array.isArray(body.runs)) {
      return NextResponse.json({ ok: false, error: "Missing runs calendar reconcile payload." }, { status: 400 });
    }

    if (!isConfigured()) {
      return NextResponse.json({ ok: true, configured: false, missingRunIds: [] });
    }

    try {
      const accessToken = await getAccessToken();
      const missingRunIds: string[] = [];
      const syncedRuns: CalendarRun[] = [];

      for (const run of body.runs) {
        if (!run.id || !run.date || !run.title) {
          return NextResponse.json({ ok: false, error: "Invalid run calendar reconcile payload." }, { status: 400 });
        }
      }

      const runById = new Map(body.runs.map((run) => [run.id, run]));
      const eventByRunId = new Map<string, GoogleCalendarEvent>();

      for (const event of await listCalendarEventsForRuns(body.runs, accessToken)) {
        const runId = event.extendedProperties?.private?.cityteamUpcomingRunId;
        if (runId && runById.has(runId) && !eventByRunId.has(runId)) {
          eventByRunId.set(runId, event);
        }
      }

      for (const run of body.runs) {
        const existingEvent = eventByRunId.get(run.id);
        if (!existingEvent) {
          missingRunIds.push(run.id);
        } else {
          syncedRuns.push(calendarRunFromEvent(run, existingEvent));
        }
      }

      return NextResponse.json({ ok: true, configured: true, missingRunIds, syncedRuns });
    } catch (error) {
      console.error("Google Calendar reconcile failed", {
        runCount: body.runs.length,
        error: error instanceof Error ? error.message : error,
      });
      return NextResponse.json(
        { ok: false, configured: true, error: error instanceof Error ? error.message : "Calendar reconcile failed." },
        { status: 502 },
      );
    }
  }

  if (!body.run?.id || !body.run.date || !body.run.title || !body.action) {
    return NextResponse.json({ ok: false, error: "Missing run calendar sync payload." }, { status: 400 });
  }

  if (!hasValidTimeRange(body.run)) {
    return NextResponse.json({ ok: false, error: "Run end time must be after start time." }, { status: 400 });
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
    console.error("Google Calendar sync failed", {
      action: body.action,
      runId: body.run.id,
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json(
      { ok: false, configured: true, error: error instanceof Error ? error.message : "Calendar sync failed." },
      { status: 502 },
    );
  }
}
