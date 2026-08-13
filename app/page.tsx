"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

type RunnerStatus = "active" | "inactive_left_program" | "inactive_working";
type LegacyRunnerStatus = RunnerStatus | "inactive" | "exited";
type PersonType = "cityteam_client" | "volunteer";
type ShoeStatus = "no_shoes" | "demo_shoes" | "new_shoes" | "new_and_demo_shoes";
type Section = "checkin" | "people" | "celebration" | "runs" | "upcoming" | "settings";

type Runner = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  status: RunnerStatus;
  personType: PersonType;
  notes?: string;
  shoeSize?: string;
  shoeStatus?: ShoeStatus;
  demoShoes?: boolean;
  tshirtSize?: string;
  oldTshirtSize?: string;
  shirtReceivedDate?: string;
  dateFirstJoined?: string;
  demoShoesReceivedDate?: string;
  newShoesReceivedDate?: string;
};

type Run = {
  id: string;
  date: string;
  title: string;
  notes?: string;
};

type Attendance = {
  id: string;
  runnerId: string;
  runId: string;
  attended: boolean;
  wasVolunteer: boolean;
  note?: string;
  checkedInBy?: string;
};

type UpcomingRun = {
  id: string;
  date: string;
  title: string;
  snackRunnerId?: string;
};

type UpcomingRunVolunteer = {
  id: string;
  upcomingRunId: string;
  runnerId: string;
  attending: boolean;
  note?: string;
};

type AppState = {
  runners: Runner[];
  runs: Run[];
  attendance: Attendance[];
  upcomingRuns: UpcomingRun[];
  upcomingRunVolunteers: UpcomingRunVolunteer[];
  admins: string[];
  syncedAt?: string;
};

type SupabaseRunnerRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  nickname: string | null;
  photo_url: string | null;
  status: LegacyRunnerStatus;
  person_type?: PersonType | null;
  team_role: string | null;
  notes: string | null;
  attendance_updates: string | null;
  shoe_size: string | null;
  shoe_status?: ShoeStatus | null;
  demo_shoes: boolean | null;
  tshirt_size: string | null;
  old_tshirt_size: string | null;
  shirt_received_date: string | null;
  date_first_joined?: string | null;
  demo_shoes_received_date?: string | null;
  new_shoes_received_date?: string | null;
};

type SupabaseRunRow = {
  id: string;
  run_date: string;
  title: string;
  notes: string | null;
};

type SupabaseAttendanceRow = {
  id: string;
  runner_id: string;
  run_id: string;
  attended: boolean;
  was_volunteer: boolean;
  note: string | null;
  checked_in_by: string | null;
};

type SupabaseAdminRow = {
  display_name: string;
  is_active: boolean;
};

type SupabaseUpcomingRunRow = {
  id: string;
  run_date: string;
  title: string;
  snack_runner_id: string | null;
};

type SupabaseUpcomingRunVolunteerRow = {
  id: string;
  upcoming_run_id: string;
  runner_id: string;
  attending: boolean;
  note?: string | null;
};

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const configuredAdmins = (process.env.NEXT_PUBLIC_RUN_CLUB_ADMINS ?? "Kevin,CityTeam volunteer")
  .split(",")
  .map((admin) => admin.trim())
  .filter(Boolean);

const personTypeLabels: Record<PersonType, string> = {
  cityteam_client: "CityTeam Client",
  volunteer: "Volunteer",
};

const statusLabels: Record<RunnerStatus, string> = {
  active: "Active",
  inactive_left_program: "Inactive - Left program",
  inactive_working: "Inactive - working",
};

const statusOptions = Object.keys(statusLabels) as RunnerStatus[];

const shoeSizeOptions = [
  "",
  "6",
  "6.5",
  "7",
  "7.5",
  "8",
  "8.5",
  "9",
  "9.5",
  "10",
  "10.5",
  "11",
  "11.5",
  "12",
  "12.5",
  "13",
  "14",
  "15",
  "16",
];

const shirtSizeOptions = ["", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

const shoeStatusLabels: Record<ShoeStatus, string> = {
  no_shoes: "No shoes",
  demo_shoes: "Demo shoes",
  new_shoes: "New shoes",
  new_and_demo_shoes: "New & Demo shoes",
};

const profilePhotoMaxPixels = 3072;
const profilePhotoQuality = 0.97;
const runClubTimeZone = "America/Los_Angeles";

const demoState: AppState = {
  admins: ["Kevin", "CityTeam volunteer"],
  syncedAt: new Date().toISOString(),
  runs: [
    { id: "run-2026-05-02", date: "2026-05-02", title: "May 2 Run" },
    { id: "run-2026-05-09", date: "2026-05-09", title: "May 9 Run" },
    { id: "run-2026-05-16", date: "2026-05-16", title: "May 16 Run" },
    { id: "run-2026-05-23", date: "2026-05-23", title: "May 23 Run" },
    { id: "run-2026-06-06", date: "2026-06-06", title: "Jun 6 Run" },
    { id: "run-2026-06-20", date: "2026-06-20", title: "Jun 20 Run" },
    { id: "run-2026-07-11", date: "2026-07-11", title: "Jul 11 Run" },
    { id: "run-2026-08-01", date: "2026-08-01", title: "Aug 1 Run" },
    { id: "run-2026-08-08", date: "2026-08-08", title: "Aug 8 Run" },
  ],
  runners: [
    {
      id: "miguel-flores",
      firstName: "Miguel F.",
      lastName: "Flores",
      status: "active",
      personType: "cityteam_client",
      shoeSize: "8",
      demoShoes: true,
      tshirtSize: "L",
      notes: "18 year old, wants to run marathon, working Saturdays now",
    },
    {
      id: "daniel-peake",
      firstName: "Daniel",
      lastName: "Peake",
      status: "active",
      personType: "volunteer",
      shoeSize: "11",
      demoShoes: true,
      tshirtSize: "L",
      notes: "half ironman",
    },
    {
      id: "duy-tran",
      firstName: "Duy",
      lastName: "Tran",
      status: "inactive_working",
      personType: "volunteer",
      shoeSize: "10",
      demoShoes: true,
      tshirtSize: "L",
      oldTshirtSize: "XL",
      notes: "D is silent, You-Eee, IT, 3 daughters, Cupertino, OC mom",
    },
    {
      id: "chuck-eissler",
      firstName: "Chuck",
      lastName: "Eissler",
      status: "inactive_left_program",
      personType: "cityteam_client",
      shoeSize: "12",
      tshirtSize: "3XL",
      notes: "Bigger, tie-dye shirt",
    },
    {
      id: "will-wells",
      firstName: "Will",
      lastName: "Wells",
      status: "active",
      personType: "volunteer",
      shoeSize: "13",
      demoShoes: true,
      notes: "Yellow shirt, CrossFit Milpitas, met wife",
    },
    {
      id: "hayden-h",
      firstName: "Hayden",
      lastName: "H",
      status: "active",
      personType: "cityteam_client",
      shoeSize: "15",
      tshirtSize: "2XL",
      oldTshirtSize: "XL",
      shirtReceivedDate: "2026-07-11",
      notes: "Tall, grew up in San Jose",
      dateFirstJoined: "2026-06-20",
    },
    {
      id: "bryan",
      firstName: "Bryan",
      lastName: "",
      status: "active",
      personType: "cityteam_client",
      shoeSize: "8",
      tshirtSize: "XL",
      notes: "Boxer, wrist push-ups, Lychee",
    },
    {
      id: "refugio-adrian",
      firstName: "Refugio",
      lastName: "",
      status: "active",
      personType: "cityteam_client",
      shoeSize: "11.5",
      tshirtSize: "2XL",
    },
  ],
  attendance: [
    ["miguel-flores", "run-2026-05-02"],
    ["miguel-flores", "run-2026-05-09"],
    ["miguel-flores", "run-2026-05-16"],
    ["miguel-flores", "run-2026-05-23"],
    ["miguel-flores", "run-2026-06-06"],
    ["miguel-flores", "run-2026-07-11"],
    ["miguel-flores", "run-2026-08-01"],
    ["daniel-peake", "run-2026-05-02"],
    ["daniel-peake", "run-2026-05-09"],
    ["daniel-peake", "run-2026-05-16"],
    ["daniel-peake", "run-2026-05-23"],
    ["daniel-peake", "run-2026-06-06"],
    ["daniel-peake", "run-2026-06-20"],
    ["daniel-peake", "run-2026-07-11"],
    ["daniel-peake", "run-2026-08-01"],
    ["daniel-peake", "run-2026-08-08"],
    ["duy-tran", "run-2026-05-02"],
    ["duy-tran", "run-2026-05-09"],
    ["duy-tran", "run-2026-05-16"],
    ["duy-tran", "run-2026-05-23"],
    ["chuck-eissler", "run-2026-05-02"],
    ["chuck-eissler", "run-2026-05-23"],
    ["chuck-eissler", "run-2026-06-06"],
    ["will-wells", "run-2026-05-02"],
    ["will-wells", "run-2026-05-09"],
    ["will-wells", "run-2026-05-16"],
    ["will-wells", "run-2026-05-23"],
    ["hayden-h", "run-2026-06-20"],
    ["hayden-h", "run-2026-07-11"],
    ["hayden-h", "run-2026-08-08"],
    ["bryan", "run-2026-07-11"],
    ["bryan", "run-2026-08-08"],
    ["refugio-adrian", "run-2026-07-11"],
    ["refugio-adrian", "run-2026-08-08"],
  ].map(([runnerId, runId], index) => ({
    id: `att-${index}`,
    runnerId,
    runId,
    attended: true,
    wasVolunteer: index % 11 === 0,
  })),
  upcomingRuns: [
    {
      id: "upcoming-2026-08-15",
      date: "2026-08-15",
      title: "Aug 15 Run",
      snackRunnerId: "daniel-peake",
    },
  ],
  upcomingRunVolunteers: [
    {
      id: "upcoming-2026-08-15-daniel-peake",
      upcomingRunId: "upcoming-2026-08-15",
      runnerId: "daniel-peake",
      attending: true,
    },
    {
      id: "upcoming-2026-08-15-will-wells",
      upcomingRunId: "upcoming-2026-08-15",
      runnerId: "will-wells",
      attending: true,
    },
  ],
};

const sections: { id: Section; label: string }[] = [
  { id: "checkin", label: "Check In" },
  { id: "people", label: "People" },
  { id: "celebration", label: "Celebration" },
  { id: "runs", label: "Trends" },
  { id: "upcoming", label: "Upcoming Runs" },
];

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: runClubTimeZone,
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00-07:00`));
}

function todayId() {
  return `run-${todayDate()}`;
}

function nextSaturdayDate(from = new Date()) {
  const current = new Date(from);
  current.setHours(12, 0, 0, 0);
  const day = current.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  current.setDate(current.getDate() + daysUntilSaturday);
  return dateInRunClubTimeZone(current);
}

function isSaturdayRunDate(date: string) {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: runClubTimeZone,
    weekday: "short",
  }).format(new Date(`${date}T12:00:00-07:00`));
  return day === "Sat";
}

function normalizeRunnerStatus(status: LegacyRunnerStatus): RunnerStatus {
  if (status === "exited") return "inactive_left_program";
  if (status === "inactive") return "inactive_working";
  return status;
}

function isActiveRunner(runner: Runner) {
  return normalizeRunnerStatus(runner.status) === "active";
}

function todayDate() {
  return dateInRunClubTimeZone(new Date());
}

function dateInRunClubTimeZone(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: runClubTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function runnerName(runner: Runner) {
  const full = `${runner.firstName} ${runner.lastName}`.trim();
  return full || "Unnamed runner";
}

function initials(runner: Runner) {
  return `${runner.firstName[0] ?? ""}${runner.lastName[0] ?? ""}`.toUpperCase();
}

function roleClassName(runner: Pick<Runner, "personType">) {
  return runner.personType === "volunteer" ? "volunteer" : "cityteam-client";
}

function countAttendance(state: AppState, runnerId: string) {
  return state.attendance.filter((item) => item.runnerId === runnerId && item.attended).length;
}

function countVolunteered(state: AppState, runnerId: string) {
  return state.attendance.filter((item) => item.runnerId === runnerId && item.wasVolunteer).length;
}

function attendanceRoleCounts(records: Attendance[], runnerById: Map<string, Runner>) {
  const clients = records.filter(
    (item) => runnerById.get(item.runnerId)?.personType === "cityteam_client",
  ).length;
  const volunteers = records.filter(
    (item) => runnerById.get(item.runnerId)?.personType === "volunteer",
  ).length;

  return {
    clients,
    volunteers,
    total: clients + volunteers,
  };
}

function sortedRunsByDate(state: AppState) {
  return state.runs.slice().sort((a, b) => a.date.localeCompare(b.date));
}

function attendedRunIds(state: AppState, runnerId: string) {
  return new Set(
    state.attendance
      .filter((item) => item.runnerId === runnerId && item.attended)
      .map((item) => item.runId),
  );
}

function currentRunStreak(state: AppState, runnerId: string, runs = sortedRunsByDate(state)) {
  const attended = attendedRunIds(state, runnerId);
  let streak = 0;

  for (let index = runs.length - 1; index >= 0; index -= 1) {
    if (!attended.has(runs[index].id)) break;
    streak += 1;
  }

  return streak;
}

function attendanceCountThroughRun(state: AppState, runnerId: string, runId: string, runs = sortedRunsByDate(state)) {
  const attended = attendedRunIds(state, runnerId);
  const runIndex = runs.findIndex((run) => run.id === runId);
  if (runIndex < 0 || !attended.has(runId)) return 0;
  return runs.slice(0, runIndex + 1).filter((run) => attended.has(run.id)).length;
}

function lastSeen(state: AppState, runnerId: string) {
  const runDates = state.attendance
    .filter((item) => item.runnerId === runnerId && item.attended)
    .map((item) => state.runs.find((run) => run.id === item.runId)?.date)
    .filter(Boolean)
    .sort() as string[];

  return runDates.length ? formatShortDate(runDates[runDates.length - 1]) : "Never";
}

function firstJoinedDate(state: AppState, runnerId: string) {
  const runDates = state.attendance
    .filter((item) => item.runnerId === runnerId && item.attended)
    .map((item) => state.runs.find((run) => run.id === item.runId)?.date)
    .filter(Boolean)
    .sort() as string[];

  return runDates[0];
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

async function supabaseRequest<T>(
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<T> {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase URL and publishable key are not configured.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
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

function fromRunnerRow(row: SupabaseRunnerRow): Runner {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name ?? "",
    photoUrl: row.photo_url ?? undefined,
    status: normalizeRunnerStatus(row.status),
    personType: row.person_type ?? "cityteam_client",
    notes: row.notes ?? undefined,
    shoeSize: row.shoe_size ?? undefined,
    shoeStatus: row.shoe_status ?? (row.demo_shoes ? "demo_shoes" : "no_shoes"),
    demoShoes: Boolean(row.demo_shoes),
    tshirtSize: row.tshirt_size ?? undefined,
    oldTshirtSize: row.old_tshirt_size ?? undefined,
    shirtReceivedDate: row.shirt_received_date ?? undefined,
    dateFirstJoined: row.date_first_joined ?? undefined,
    demoShoesReceivedDate: row.demo_shoes_received_date ?? undefined,
    newShoesReceivedDate: row.new_shoes_received_date ?? undefined,
  };
}

function toRunnerRow(runner: Runner): SupabaseRunnerRow {
  return {
    id: runner.id,
    first_name: runner.firstName,
    last_name: runner.lastName || null,
    nickname: null,
    photo_url: runner.photoUrl || null,
    status: normalizeRunnerStatus(runner.status),
    person_type: runner.personType,
    team_role: null,
    notes: runner.notes || null,
    attendance_updates: null,
    shoe_size: runner.shoeSize || null,
    shoe_status: runner.shoeStatus ?? (runner.demoShoes ? "demo_shoes" : "no_shoes"),
    demo_shoes: Boolean(runner.demoShoes),
    tshirt_size: runner.tshirtSize || null,
    old_tshirt_size: runner.oldTshirtSize || null,
    shirt_received_date: runner.shirtReceivedDate || null,
    date_first_joined: runner.dateFirstJoined || null,
    demo_shoes_received_date: runner.demoShoesReceivedDate || null,
    new_shoes_received_date: runner.newShoesReceivedDate || null,
  };
}

function fromRunRow(row: SupabaseRunRow): Run {
  return {
    id: row.id,
    date: row.run_date,
    title: row.title,
    notes: row.notes ?? undefined,
  };
}

function toRunRow(run: Run): SupabaseRunRow {
  return {
    id: run.id,
    run_date: run.date,
    title: run.title,
    notes: run.notes || null,
  };
}

function fromAttendanceRow(row: SupabaseAttendanceRow): Attendance {
  return {
    id: row.id,
    runnerId: row.runner_id,
    runId: row.run_id,
    attended: row.attended,
    wasVolunteer: row.was_volunteer,
    note: row.note ?? undefined,
    checkedInBy: row.checked_in_by ?? undefined,
  };
}

function toAttendanceRow(attendance: Attendance): SupabaseAttendanceRow {
  return {
    id: attendance.id,
    runner_id: attendance.runnerId,
    run_id: attendance.runId,
    attended: attendance.attended,
    was_volunteer: attendance.wasVolunteer,
    note: attendance.note || null,
    checked_in_by: attendance.checkedInBy || null,
  };
}

function fromUpcomingRunRow(row: SupabaseUpcomingRunRow): UpcomingRun {
  return {
    id: row.id,
    date: row.run_date,
    title: row.title,
    snackRunnerId: row.snack_runner_id ?? undefined,
  };
}

function toUpcomingRunRow(run: UpcomingRun): SupabaseUpcomingRunRow {
  return {
    id: run.id,
    run_date: run.date,
    title: run.title,
    snack_runner_id: run.snackRunnerId || null,
  };
}

function fromUpcomingRunVolunteerRow(row: SupabaseUpcomingRunVolunteerRow): UpcomingRunVolunteer {
  return {
    id: row.id,
    upcomingRunId: row.upcoming_run_id,
    runnerId: row.runner_id,
    attending: row.attending,
    note: row.note ?? undefined,
  };
}

function toUpcomingRunVolunteerRow(volunteer: UpcomingRunVolunteer): SupabaseUpcomingRunVolunteerRow {
  return {
    id: volunteer.id,
    upcoming_run_id: volunteer.upcomingRunId,
    runner_id: volunteer.runnerId,
    attending: volunteer.attending,
    note: volunteer.note || null,
  };
}

async function loadSupabaseState(): Promise<AppState> {
  const [runners, runs, attendance, upcomingRuns, upcomingRunVolunteers, admins] = await Promise.all([
    supabaseRequest<SupabaseRunnerRow[]>("runners?select=*&order=status.asc,first_name.asc,last_name.asc"),
    supabaseRequest<SupabaseRunRow[]>("runs?select=*&order=run_date.asc"),
    supabaseRequest<SupabaseAttendanceRow[]>("attendance?select=*&order=created_at.asc"),
    supabaseRequest<SupabaseUpcomingRunRow[]>("upcoming_runs?select=*&order=run_date.asc")
      .catch(() => []),
    supabaseRequest<SupabaseUpcomingRunVolunteerRow[]>("upcoming_run_volunteers?select=*&order=created_at.asc")
      .catch(() => []),
    supabaseRequest<SupabaseAdminRow[]>("admins?select=display_name,is_active&is_active=eq.true&order=display_name.asc")
      .catch(() => []),
  ]);

  return {
    runners: runners.map(fromRunnerRow),
    runs: runs.map(fromRunRow),
    attendance: attendance.map(fromAttendanceRow),
    upcomingRuns: upcomingRuns.map(fromUpcomingRunRow),
    upcomingRunVolunteers: upcomingRunVolunteers.map(fromUpcomingRunVolunteerRow),
    admins: admins.length ? admins.map((admin) => admin.display_name) : configuredAdmins,
    syncedAt: new Date().toISOString(),
  };
}

async function upsertRun(run: Run) {
  return supabaseRequest<SupabaseRunRow[]>("runs?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify(toRunRow(run)),
  });
}

async function upsertAttendance(attendance: Attendance) {
  return supabaseRequest<SupabaseAttendanceRow[]>("attendance?on_conflict=runner_id,run_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify(toAttendanceRow(attendance)),
  });
}

async function deleteRunRecords(runId: string) {
  await supabaseRequest<void>(`attendance?run_id=eq.${encodeURIComponent(runId)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
  await supabaseRequest<void>(`runs?id=eq.${encodeURIComponent(runId)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
}

async function deleteRunnerRecords(runnerId: string) {
  await supabaseRequest<void>(`attendance?runner_id=eq.${encodeURIComponent(runnerId)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
  await supabaseRequest<void>(`upcoming_run_volunteers?runner_id=eq.${encodeURIComponent(runnerId)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  }).catch(() => undefined);
  await supabaseRequest<void>(`runners?id=eq.${encodeURIComponent(runnerId)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
}

async function upsertUpcomingRun(run: UpcomingRun) {
  return supabaseRequest<SupabaseUpcomingRunRow[]>("upcoming_runs?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify(toUpcomingRunRow(run)),
  });
}

async function upsertUpcomingRunVolunteer(volunteer: UpcomingRunVolunteer) {
  return supabaseRequest<SupabaseUpcomingRunVolunteerRow[]>("upcoming_run_volunteers?on_conflict=upcoming_run_id,runner_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify(toUpcomingRunVolunteerRow(volunteer)),
  });
}

async function deleteUpcomingRunRecords(runId: string) {
  await supabaseRequest<void>(`upcoming_run_volunteers?upcoming_run_id=eq.${encodeURIComponent(runId)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
  await supabaseRequest<void>(`upcoming_runs?id=eq.${encodeURIComponent(runId)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
}

async function insertRunner(runner: Runner) {
  return supabaseRequest<SupabaseRunnerRow[]>("runners", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify(toRunnerRow(runner)),
  });
}

async function updateRunnerPhotoUrl(runnerId: string, photoUrl: string) {
  return supabaseRequest<SupabaseRunnerRow[]>(`runners?id=eq.${encodeURIComponent(runnerId)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({ photo_url: photoUrl }),
  });
}

async function updateRunnerNotes(runnerId: string, notes: string) {
  return supabaseRequest<SupabaseRunnerRow[]>(`runners?id=eq.${encodeURIComponent(runnerId)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({ notes: notes || null }),
  });
}

async function updateRunnerPersonType(runnerId: string, personType: PersonType) {
  return supabaseRequest<SupabaseRunnerRow[]>(`runners?id=eq.${encodeURIComponent(runnerId)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({ person_type: personType }),
  });
}

async function updateRunnerStatus(runnerId: string, status: RunnerStatus) {
  return supabaseRequest<SupabaseRunnerRow[]>(`runners?id=eq.${encodeURIComponent(runnerId)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({ status }),
  });
}

async function updateRunnerProfile(runnerId: string, runner: Runner) {
  return supabaseRequest<SupabaseRunnerRow[]>(`runners?id=eq.${encodeURIComponent(runnerId)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify(toRunnerRow(runner)),
  });
}

async function updateRunnerGear(
  runnerId: string,
  gear: Pick<Runner, "shoeSize" | "shoeStatus" | "demoShoes" | "tshirtSize">,
) {
  return supabaseRequest<SupabaseRunnerRow[]>(`runners?id=eq.${encodeURIComponent(runnerId)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({
      shoe_size: gear.shoeSize || null,
      shoe_status: gear.shoeStatus ?? "no_shoes",
      demo_shoes: Boolean(gear.demoShoes),
      tshirt_size: gear.tshirtSize || null,
    }),
  });
}

export default function Home() {
  const [state, setState] = useState<AppState>(demoState);
  const [section, setSection] = useState<Section>("checkin");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RunnerStatus | "all">("active");
  const [personTypeFilter, setPersonTypeFilter] = useState<PersonType | "all">("all");
  const [selectedRunnerId, setSelectedRunnerId] = useState<string>(demoState.runners[1].id);
  const [todayRunId, setTodayRunId] = useState(todayId());
  const [connectionState, setConnectionState] = useState<"demo" | "loading" | "connected" | "error">(
    hasSupabaseConfig() ? "loading" : "demo",
  );
  const [message, setMessage] = useState(
    hasSupabaseConfig()
      ? "Connecting to Supabase..."
      : "Demo mode. Add the Supabase URL and publishable key to save changes.",
  );
  const [newRunnerOpen, setNewRunnerOpen] = useState(false);
  const [newRunner, setNewRunner] = useState({ firstName: "", lastName: "", notes: "" });
  const [photoEditorRunner, setPhotoEditorRunner] = useState<Runner | null>(null);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const adminName = state.admins[0] ?? configuredAdmins[0] ?? "Admin";

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) return;
      try {
        const incoming = await loadSupabaseState();
        const today = todayId();
        setState(incoming);
        setTodayRunId(today);
        setSelectedRunnerId(incoming.runners[0]?.id ?? "");
        setConnectionState("connected");
        setMessage("Connected to Supabase.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Could not connect to Supabase.");
      }
    }

    load();
  }, []);

  const todayRun = useMemo(() => {
    const existing = state.runs.find((run) => run.id === todayRunId);
    if (existing) return existing;
    const date = todayDate();
    return { id: todayRunId, date, title: `${formatShortDate(date)} Run` };
  }, [state.runs, todayRunId]);
  const isScheduledRunDay = isSaturdayRunDate(todayRun.date);

  const todayAttendance = useMemo(
    () => state.attendance.filter((item) => item.runId === todayRunId && item.attended),
    [state.attendance, todayRunId],
  );

  const filteredRunners = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return state.runners
      .filter((runner) => statusFilter === "all" || normalizeRunnerStatus(runner.status) === statusFilter)
      .filter((runner) => personTypeFilter === "all" || runner.personType === personTypeFilter)
      .filter((runner) => {
        if (!clean) return true;
        return [
          runner.firstName,
          runner.lastName,
          personTypeLabels[runner.personType],
          runner.notes,
          runner.tshirtSize,
          runner.shoeSize,
        ]
          .join(" ")
          .toLowerCase()
          .includes(clean);
      })
      .sort((a, b) => runnerName(a).localeCompare(runnerName(b)));
  }, [query, state.runners, statusFilter, personTypeFilter]);

  const selectedRunner = state.runners.find((runner) => runner.id === selectedRunnerId) ?? state.runners[0];

  function openRunnerProfile(runnerId: string) {
    setSelectedRunnerId(runnerId);
    setMobileProfileOpen(true);
  }

  const checkinSummary = useMemo(() => {
    const firstTimers = todayAttendance.filter((item) => countAttendance(state, item.runnerId) === 1).length;
    const cityTeamClientsToday = todayAttendance.filter(
      (item) => state.runners.find((runner) => runner.id === item.runnerId)?.personType === "cityteam_client",
    ).length;

    return {
      checkedIn: todayAttendance.length,
      cityTeamClientsToday,
      volunteersToday: todayAttendance.filter((item) => item.wasVolunteer).length,
      firstTimers,
    };
  }, [state, todayAttendance]);

  function isCheckedIn(runnerId: string) {
    return state.attendance.some((item) => item.runnerId === runnerId && item.runId === todayRunId && item.attended);
  }

  async function updateAttendance(runnerId: string, updates: Partial<Attendance>) {
    if (!isScheduledRunDay) {
      setMessage("No scheduled run today. Run Club check-ins are only enabled on Saturdays.");
      return;
    }

    const existing = state.attendance.find((item) => item.runnerId === runnerId && item.runId === todayRunId);
    const next: Attendance = {
      id: existing?.id ?? `att-${runnerId}-${todayRunId}`,
      runnerId,
      runId: todayRunId,
      attended: updates.attended ?? existing?.attended ?? false,
      wasVolunteer: updates.wasVolunteer ?? existing?.wasVolunteer ?? false,
      note: updates.note ?? existing?.note,
      checkedInBy: adminName,
    };

    setState((current) => ({
      ...current,
      runs: current.runs.some((run) => run.id === todayRunId) ? current.runs : [...current.runs, todayRun],
      attendance: existing
        ? current.attendance.map((item) => (item.id === existing.id ? next : item))
        : [...current.attendance, next],
    }));

    if (hasSupabaseConfig()) {
      try {
        await upsertRun(todayRun);
        await upsertAttendance(next);
        setConnectionState("connected");
        setMessage("Saved to Supabase.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Saved locally, but Supabase did not update.");
      }
    }
  }

  async function updateRunAttendance(runnerId: string, runId: string, attended: boolean) {
    const existing = state.attendance.find((item) => item.runnerId === runnerId && item.runId === runId);
    const next: Attendance = {
      id: existing?.id ?? `att-${runnerId}-${runId}`,
      runnerId,
      runId,
      attended,
      wasVolunteer: state.runners.find((runner) => runner.id === runnerId)?.personType === "volunteer",
      note: existing?.note,
      checkedInBy: adminName,
    };

    setState((current) => ({
      ...current,
      attendance: existing
        ? current.attendance.map((item) => (item.id === existing.id ? next : item))
        : [...current.attendance, next],
    }));

    if (hasSupabaseConfig()) {
      try {
        await upsertAttendance(next);
        setConnectionState("connected");
        setMessage("Attendance correction saved to Supabase.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Attendance updated locally, but Supabase did not update.");
      }
    }
  }

  async function deleteRun(runId: string) {
    const run = state.runs.find((candidate) => candidate.id === runId);
    if (!run) return;

    setState((current) => ({
      ...current,
      runs: current.runs.filter((candidate) => candidate.id !== runId),
      attendance: current.attendance.filter((item) => item.runId !== runId),
    }));

    if (hasSupabaseConfig()) {
      try {
        await deleteRunRecords(runId);
        setConnectionState("connected");
        setMessage(`${run.title} deleted from Supabase.`);
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Run deleted locally, but Supabase did not update.");
      }
    }
  }

  async function createUpcomingRun(date: string, title?: string) {
    if (!date) return;
    const run: UpcomingRun = {
      id: `upcoming-${date}`,
      date,
      title: title?.trim() || `${formatShortDate(date)} Run`,
    };

    setState((current) => ({
      ...current,
      upcomingRuns: current.upcomingRuns.some((candidate) => candidate.id === run.id)
        ? current.upcomingRuns.map((candidate) => (candidate.id === run.id ? run : candidate))
        : [...current.upcomingRuns, run],
    }));

    if (hasSupabaseConfig()) {
      try {
        await upsertUpcomingRun(run);
        setConnectionState("connected");
        setMessage(`${run.title} added to upcoming runs.`);
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Upcoming run saved locally, but Supabase did not update.");
      }
    }
  }

  async function updateUpcomingRunTitle(upcomingRunId: string, title: string) {
    const currentRun = state.upcomingRuns.find((run) => run.id === upcomingRunId);
    const cleanTitle = title.trim();
    if (!currentRun || !cleanTitle) return;
    const nextRun = { ...currentRun, title: cleanTitle };

    setState((current) => ({
      ...current,
      upcomingRuns: current.upcomingRuns.map((run) => (run.id === upcomingRunId ? nextRun : run)),
    }));

    if (hasSupabaseConfig()) {
      try {
        await upsertUpcomingRun(nextRun);
        setConnectionState("connected");
        setMessage("Upcoming run title saved.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Run title saved locally, but Supabase did not update.");
      }
    }
  }

  async function updateUpcomingVolunteer(upcomingRunId: string, runnerId: string, attending: boolean, note?: string) {
    const existing = state.upcomingRunVolunteers.find(
      (item) => item.upcomingRunId === upcomingRunId && item.runnerId === runnerId,
    );
    const volunteer: UpcomingRunVolunteer = {
      id: existing?.id ?? `${upcomingRunId}-${runnerId}`,
      upcomingRunId,
      runnerId,
      attending,
      note: note?.trim() || undefined,
    };

    setState((current) => {
      const existing = current.upcomingRunVolunteers.find(
        (item) => item.upcomingRunId === upcomingRunId && item.runnerId === runnerId,
      );
      return {
        ...current,
        upcomingRunVolunteers: existing
          ? current.upcomingRunVolunteers.map((item) => (item.id === existing.id ? volunteer : item))
          : [...current.upcomingRunVolunteers, volunteer],
      };
    });

    if (hasSupabaseConfig()) {
      try {
        await upsertUpcomingRunVolunteer(volunteer);
        setConnectionState("connected");
        setMessage(attending ? "Volunteer marked attending." : "Volunteer declined with note.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "RSVP saved locally, but Supabase did not update.");
      }
    }
  }

  async function updateUpcomingSnackVolunteer(upcomingRunId: string, runnerId: string) {
    const currentRun = state.upcomingRuns.find((run) => run.id === upcomingRunId);
    if (!currentRun) return;
    const nextRun = { ...currentRun, snackRunnerId: runnerId || undefined };

    setState((current) => ({
      ...current,
      upcomingRuns: current.upcomingRuns.map((run) => (run.id === upcomingRunId ? nextRun : run)),
    }));

    if (hasSupabaseConfig()) {
      try {
        await upsertUpcomingRun(nextRun);
        setConnectionState("connected");
        setMessage("Snack volunteer saved.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Snack volunteer saved locally, but Supabase did not update.");
      }
    }
  }

  async function deleteUpcomingRun(upcomingRunId: string) {
    const run = state.upcomingRuns.find((candidate) => candidate.id === upcomingRunId);
    if (!run) return;

    setState((current) => ({
      ...current,
      upcomingRuns: current.upcomingRuns.filter((candidate) => candidate.id !== upcomingRunId),
      upcomingRunVolunteers: current.upcomingRunVolunteers.filter((item) => item.upcomingRunId !== upcomingRunId),
    }));

    if (hasSupabaseConfig()) {
      try {
        await deleteUpcomingRunRecords(upcomingRunId);
        setConnectionState("connected");
        setMessage(`${run.title} removed from upcoming runs.`);
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Upcoming run deleted locally, but Supabase did not update.");
      }
    }
  }

  async function deleteRunner(runnerId: string) {
    const runner = state.runners.find((candidate) => candidate.id === runnerId);
    if (!runner) return;
    const remainingRunners = state.runners.filter((candidate) => candidate.id !== runnerId);

    setState((current) => ({
      ...current,
      runners: current.runners.filter((candidate) => candidate.id !== runnerId),
      attendance: current.attendance.filter((item) => item.runnerId !== runnerId),
      upcomingRuns: current.upcomingRuns.map((run) =>
        run.snackRunnerId === runnerId ? { ...run, snackRunnerId: undefined } : run,
      ),
      upcomingRunVolunteers: current.upcomingRunVolunteers.filter((item) => item.runnerId !== runnerId),
    }));
    setSelectedRunnerId(remainingRunners[0]?.id ?? "");
    setMobileProfileOpen(false);
    setPhotoEditorRunner((current) => (current?.id === runnerId ? null : current));

    if (hasSupabaseConfig()) {
      try {
        await deleteRunnerRecords(runnerId);
        setConnectionState("connected");
        setMessage(`${runnerName(runner)} deleted from Supabase.`);
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Profile deleted locally, but Supabase did not update.");
      }
    }
  }

  async function createRunner() {
    if (!newRunner.firstName.trim()) return;
    const runner: Runner = {
      id: `runner-${Date.now()}`,
      firstName: newRunner.firstName.trim(),
      lastName: newRunner.lastName.trim(),
      notes: newRunner.notes.trim(),
      status: "active",
      personType: "cityteam_client",
    };
    setState((current) => ({ ...current, runners: [runner, ...current.runners] }));
    setSelectedRunnerId(runner.id);
    setMobileProfileOpen(true);
    setNewRunner({ firstName: "", lastName: "", notes: "" });
    setNewRunnerOpen(false);

    if (hasSupabaseConfig()) {
      try {
        await insertRunner(runner);
        setConnectionState("connected");
        setMessage("New runner saved to Supabase.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Runner added locally, but Supabase did not update.");
      }
    }
  }

  async function saveRunnerPhoto(runnerId: string, photoUrl: string) {
    setState((current) => ({
      ...current,
      runners: current.runners.map((runner) =>
        runner.id === runnerId ? { ...runner, photoUrl } : runner,
      ),
    }));
    setPhotoEditorRunner(null);

    if (hasSupabaseConfig()) {
      try {
        await updateRunnerPhotoUrl(runnerId, photoUrl);
        setConnectionState("connected");
        setMessage("Profile photo saved to Supabase.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Photo saved locally, but Supabase did not update.");
      }
    }
  }

  async function saveRunnerNotes(runnerId: string, notes: string) {
    setState((current) => ({
      ...current,
      runners: current.runners.map((runner) =>
        runner.id === runnerId ? { ...runner, notes } : runner,
      ),
    }));

    if (hasSupabaseConfig()) {
      try {
        await updateRunnerNotes(runnerId, notes);
        setConnectionState("connected");
        setMessage("Notes saved to Supabase.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Notes saved locally, but Supabase did not update.");
      }
    }
  }

  async function saveRunnerPersonType(runnerId: string, personType: PersonType) {
    setState((current) => ({
      ...current,
      runners: current.runners.map((runner) =>
        runner.id === runnerId ? { ...runner, personType } : runner,
      ),
    }));

    if (hasSupabaseConfig()) {
      try {
        await updateRunnerPersonType(runnerId, personType);
        setConnectionState("connected");
        setMessage("Person type saved to Supabase.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Type saved locally, but Supabase did not update.");
      }
    }
  }

  async function saveRunnerStatus(runnerId: string, status: RunnerStatus) {
    setState((current) => ({
      ...current,
      runners: current.runners.map((runner) =>
        runner.id === runnerId ? { ...runner, status } : runner,
      ),
    }));

    if (hasSupabaseConfig()) {
      try {
        await updateRunnerStatus(runnerId, status);
        setConnectionState("connected");
        setMessage("Status saved to Supabase.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Status saved locally, but Supabase did not update.");
      }
    }
  }

  async function saveRunnerGear(
    runnerId: string,
    gear: Pick<Runner, "shoeSize" | "shoeStatus" | "demoShoes" | "tshirtSize">,
  ) {
    setState((current) => ({
      ...current,
      runners: current.runners.map((runner) =>
        runner.id === runnerId ? { ...runner, ...gear } : runner,
      ),
    }));

    if (hasSupabaseConfig()) {
      try {
        await updateRunnerGear(runnerId, gear);
        setConnectionState("connected");
        setMessage("Gear saved to Supabase.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Gear saved locally, but Supabase did not update.");
      }
    }
  }

  async function saveRunnerProfile(runnerId: string, updates: Partial<Runner>) {
    const currentRunner = state.runners.find((runner) => runner.id === runnerId);
    if (!currentRunner) return;
    const nextRunner: Runner = {
      ...currentRunner,
      ...updates,
      demoShoes: updates.shoeStatus
        ? updates.shoeStatus === "demo_shoes" || updates.shoeStatus === "new_and_demo_shoes"
        : currentRunner.demoShoes,
    };

    setState((current) => ({
      ...current,
      runners: current.runners.map((runner) => (runner.id === runnerId ? nextRunner : runner)),
    }));

    if (hasSupabaseConfig()) {
      try {
        await updateRunnerProfile(runnerId, nextRunner);
        setConnectionState("connected");
        setMessage("Profile saved to Supabase.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Profile saved locally, but Supabase did not update.");
      }
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-lockup">
          <img className="brand-logo" src="/cityteamlogo.svg" alt="CityTeam" />
          <div>
            <h1>Run Club</h1>
          </div>
        </div>

        <nav className="nav-list">
          {sections.map((item) => (
            <button
              key={item.id}
              className={section === item.id ? "nav-item active" : "nav-item"}
              onClick={() => {
                setSection(item.id);
                setMobileProfileOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
          <a
            className="nav-item"
            href="https://photos.app.goo.gl/qfBZysZRK31yaNKC6"
            target="_blank"
            rel="noreferrer"
          >
            Photo Album
          </a>
        </nav>

      </aside>

      <section className="workspace">
        {section === "checkin" && (
          <div className="checkin-layout">
            <section className="run-panel">
              <div className="run-summary">
                <div>
                  <p className="eyebrow">{formatShortDate(todayRun.date)}</p>
                  <h3>{checkinSummary.checkedIn} checked in</h3>
                </div>
                <div className="summary-pills">
                  <span>{checkinSummary.cityTeamClientsToday} CityTeam clients</span>
                  <span>{checkinSummary.volunteersToday} volunteers</span>
                  <span>{checkinSummary.firstTimers} first-timers</span>
                </div>
              </div>
              {!isScheduledRunDay && (
                <div className="run-day-notice">
                  <strong>No scheduled run today</strong>
                  <span>Check-ins are only enabled on Saturdays. Use Runs to correct past attendance.</span>
                </div>
              )}

              <div className="toolbar">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, note, role, size..."
                  aria-label="Search runners"
                />
                <button className="primary-action" onClick={() => setNewRunnerOpen(true)}>Add Runner</button>
              </div>

              <div className="filter-row" aria-label="Runner status filter">
                {([...statusOptions, "all"] as const).map((status) => (
                  <button
                    key={status}
                    className={statusFilter === status ? "filter active" : "filter"}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status === "all" ? "All" : statusLabels[status]}
                  </button>
                ))}
              </div>

              <div className="filter-row" aria-label="Person type filter">
                {(["all", "cityteam_client", "volunteer"] as const).map((personType) => (
                  <button
                    key={personType}
                    className={personTypeFilter === personType ? "filter active" : "filter"}
                    onClick={() => setPersonTypeFilter(personType)}
                  >
                    {personType === "all" ? "All Types" : personTypeLabels[personType]}
                  </button>
                ))}
              </div>

              {newRunnerOpen && (
                <div className="new-runner-form">
                  <input
                    value={newRunner.firstName}
                    onChange={(event) => setNewRunner((current) => ({ ...current, firstName: event.target.value }))}
                    placeholder="First name"
                    aria-label="New runner first name"
                  />
                  <input
                    value={newRunner.lastName}
                    onChange={(event) => setNewRunner((current) => ({ ...current, lastName: event.target.value }))}
                    placeholder="Last name"
                    aria-label="New runner last name"
                  />
                  <input
                    value={newRunner.notes}
                    onChange={(event) => setNewRunner((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Quick note"
                    aria-label="New runner note"
                  />
                  <button onClick={createRunner}>Save</button>
                </div>
              )}

              <div className="runner-list">
                {filteredRunners.map((runner) => (
                  <article
                    key={runner.id}
                    className={["runner-row", roleClassName(runner), isCheckedIn(runner.id) ? "checked" : ""].filter(Boolean).join(" ")}
                  >
                    <button className="runner-main" onClick={() => openRunnerProfile(runner.id)}>
                      <Avatar runner={runner} />
                      <span>
                        <strong>{runnerName(runner)}</strong>
                        <small>
                          <span className="inline-type">{personTypeLabels[runner.personType]}</span>
                          {" | "}
                          {runner.notes || "Runner"} | {countAttendance(state, runner.id)} runs | Last run {lastSeen(state, runner.id)}
                        </small>
                      </span>
                    </button>
                    <div className="row-actions">
                      <button
                        className={isCheckedIn(runner.id) ? "present-toggle active" : "present-toggle"}
                        disabled={!isScheduledRunDay}
                        onClick={() => updateAttendance(runner.id, { attended: !isCheckedIn(runner.id) })}
                      >
                        {!isScheduledRunDay ? "No Run" : isCheckedIn(runner.id) ? "Present" : "Check In"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <ProfileCard
              key={profileCardKey(selectedRunner, mobileProfileOpen)}
              runner={selectedRunner}
              state={state}
              onEditPhoto={(runner) => setPhotoEditorRunner(runner)}
              onSaveProfile={saveRunnerProfile}
              onDeleteProfile={deleteRunner}
              isMobileOpen={mobileProfileOpen}
              onCloseMobile={() => setMobileProfileOpen(false)}
            />
          </div>
        )}

        {section === "people" && (
          <PeopleSection
            state={state}
            selectedRunner={selectedRunner}
            selectRunner={openRunnerProfile}
            onEditPhoto={(runner) => setPhotoEditorRunner(runner)}
            onSaveProfile={saveRunnerProfile}
            onDeleteProfile={deleteRunner}
            isMobileOpen={mobileProfileOpen}
            onCloseMobile={() => setMobileProfileOpen(false)}
          />
        )}
        {section === "celebration" && (
          <RunDayCelebrationSection
            state={state}
            onOpenProfile={(runnerId) => {
              openRunnerProfile(runnerId);
              setSection("checkin");
            }}
          />
        )}
        {section === "runs" && (
          <RunsSection
            state={state}
            onToggleAttendance={updateRunAttendance}
            onDeleteRun={deleteRun}
            onOpenProfile={(runnerId) => {
              openRunnerProfile(runnerId);
              setSection("checkin");
            }}
          />
        )}
        {section === "upcoming" && (
          <UpcomingRunsSection
            state={state}
            onCreateRun={createUpcomingRun}
            onUpdateRunTitle={updateUpcomingRunTitle}
            onToggleVolunteer={updateUpcomingVolunteer}
            onSetSnackVolunteer={updateUpcomingSnackVolunteer}
            onDeleteRun={deleteUpcomingRun}
          />
        )}
        {section === "settings" && <SettingsSection />}
      </section>

      {photoEditorRunner && (
        <PhotoCropper
          runner={photoEditorRunner}
          onCancel={() => setPhotoEditorRunner(null)}
          onSave={(photoUrl) => saveRunnerPhoto(photoEditorRunner.id, photoUrl)}
        />
      )}
    </main>
  );
}

function Avatar({ runner }: { runner: Runner }) {
  if (runner.photoUrl) {
    return <img className="avatar" src={runner.photoUrl} alt={`${runnerName(runner)} profile`} />;
  }
  return <span className="avatar fallback">{initials(runner)}</span>;
}

function profileDraftFromRunner(runner?: Runner) {
  return {
    firstName: runner?.firstName ?? "",
    lastName: runner?.lastName ?? "",
    status: normalizeRunnerStatus(runner?.status ?? "active"),
    personType: runner?.personType ?? "cityteam_client",
    notes: runner?.notes ?? "",
    shoeSize: runner?.shoeSize ?? "",
    tshirtSize: runner?.tshirtSize ?? "",
    shirtReceivedDate: runner?.shirtReceivedDate ?? "",
    demoShoesReceivedDate: runner?.demoShoesReceivedDate ?? "",
    newShoesReceivedDate: runner?.newShoesReceivedDate ?? "",
  };
}

function profileCardKey(runner?: Runner, isMobileOpen = false) {
  if (!runner) return isMobileOpen ? "empty-open" : "empty-closed";
  return [
    runner.id,
    runner.firstName,
    runner.lastName,
    runner.personType,
    normalizeRunnerStatus(runner.status),
    runner.notes ?? "",
    runner.shoeSize ?? "",
    runner.tshirtSize ?? "",
    runner.shirtReceivedDate ?? "",
    runner.demoShoesReceivedDate ?? "",
    runner.newShoesReceivedDate ?? "",
    isMobileOpen ? "open" : "closed",
  ].join("|");
}

function ProfileCard({
  runner,
  state,
  onEditPhoto,
  onSaveProfile,
  onDeleteProfile,
  isMobileOpen,
  onCloseMobile,
}: {
  runner?: Runner;
  state: AppState;
  onEditPhoto: (runner: Runner) => void;
  onSaveProfile: (runnerId: string, updates: Partial<Runner>) => Promise<void>;
  onDeleteProfile: (runnerId: string) => Promise<void>;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState(() => profileDraftFromRunner(runner));
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, []);

  if (!runner) return null;
  const recentRuns = state.runs
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
  const recentRunTrend = recentRuns.map((run) => ({
    run,
    attended: state.attendance.some(
      (item) => item.runnerId === runner.id && item.runId === run.id && item.attended,
    ),
  }));
  const recentAttendances = recentRunTrend.filter((item) => item.attended).length;
  const recentAttendanceRate = recentRunTrend.length
    ? Math.round((recentAttendances / recentRunTrend.length) * 100)
    : 0;
  const totalRunsAttended = countAttendance(state, runner.id);
  const automaticFirstJoinedDate = firstJoinedDate(state, runner.id) ?? runner.dateFirstJoined;
  const canEarnNewShoes = (isEditingProfile ? profileDraft.personType : runner.personType) === "cityteam_client";

  return (
    <aside className={isMobileOpen ? "profile-panel mobile-profile-open" : "profile-panel"} ref={panelRef}>
      <div className="mobile-profile-bar">
        <button className="text-action" onClick={onCloseMobile}>
          Back to list
        </button>
        <strong>{runnerName(runner)}</strong>
      </div>

      <div className="profile-photo-card">
        {runner.photoUrl ? (
          <img className="profile-photo-large" src={runner.photoUrl} alt={`${runnerName(runner)} profile`} />
        ) : (
          <div className="profile-photo-large fallback">{initials(runner)}</div>
        )}
        <button className="photo-edit-button" onClick={() => onEditPhoto(runner)}>
          {runner.photoUrl ? "Change Photo" : "Upload Photo"}
        </button>
      </div>

      <div className="profile-hero">
        <div>
          <p className="eyebrow">{statusLabels[normalizeRunnerStatus(runner.status)]}</p>
          <h3>{runnerName(runner)}</h3>
          <p>{personTypeLabels[runner.personType]}</p>
        </div>
        <button className="text-action" onClick={() => setIsEditingProfile(true)} disabled={isEditingProfile}>
          Edit
        </button>
      </div>

      <section>
        <div className="profile-section-heading">
          <h4>Profile Details</h4>
        </div>
        <div className={isEditingProfile ? "profile-editor" : "profile-editor read-only-profile"}>
          <label>
            <span>First name</span>
            {isEditingProfile ? (
              <input
                value={profileDraft.firstName}
                onChange={(event) => setProfileDraft((current) => ({ ...current, firstName: event.target.value }))}
              />
            ) : (
              <strong className="read-only-field">{runner.firstName || "Not set"}</strong>
            )}
          </label>
          <label>
            <span>Last name</span>
            {isEditingProfile ? (
              <input
                value={profileDraft.lastName}
                onChange={(event) => setProfileDraft((current) => ({ ...current, lastName: event.target.value }))}
              />
            ) : (
              <strong className="read-only-field">{runner.lastName || "Not set"}</strong>
            )}
          </label>
          <label>
            <span>Status</span>
            {isEditingProfile ? (
              <select
                value={profileDraft.status}
                onChange={(event) => setProfileDraft((current) => ({ ...current, status: event.target.value as RunnerStatus }))}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{statusLabels[status]}</option>
                ))}
              </select>
            ) : (
              <strong className="read-only-field">{statusLabels[normalizeRunnerStatus(runner.status)]}</strong>
            )}
          </label>
          <label>
            <span>Type</span>
            {isEditingProfile ? (
              <select
                value={profileDraft.personType}
                onChange={(event) => setProfileDraft((current) => ({ ...current, personType: event.target.value as PersonType }))}
              >
                {(["cityteam_client", "volunteer"] as const).map((personType) => (
                  <option key={personType} value={personType}>{personTypeLabels[personType]}</option>
                ))}
              </select>
            ) : (
              <strong className="read-only-field">{personTypeLabels[runner.personType]}</strong>
            )}
          </label>
          {canEarnNewShoes && (
            <>
              <div className="profile-editor-section">
                <span className="profile-section-label shoes">Shoes</span>
              </div>
              <label>
                <span>Shoe size</span>
                {isEditingProfile ? (
                  <select
                    value={profileDraft.shoeSize}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, shoeSize: event.target.value }))}
                  >
                    {shoeSizeOptions.map((size) => (
                      <option key={size || "blank"} value={size}>{size || "Unknown"}</option>
                    ))}
                  </select>
                ) : (
                  <strong className="read-only-field">{runner.shoeSize || "Unknown"}</strong>
                )}
              </label>
              <label>
                <span>Demo shoes received</span>
                {isEditingProfile ? (
                  <input
                    type="date"
                    value={profileDraft.demoShoesReceivedDate}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, demoShoesReceivedDate: event.target.value }))}
                  />
                ) : (
                  <strong className="read-only-field">
                    {runner.demoShoesReceivedDate ? formatShortDate(runner.demoShoesReceivedDate) : "Not received"}
                  </strong>
                )}
              </label>
              <label>
                <span>New shoes received</span>
                {isEditingProfile ? (
                  <input
                    type="date"
                    value={profileDraft.newShoesReceivedDate}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, newShoesReceivedDate: event.target.value }))}
                  />
                ) : (
                  <strong className="read-only-field">
                    {runner.newShoesReceivedDate ? formatShortDate(runner.newShoesReceivedDate) : "Not received"}
                  </strong>
                )}
              </label>
              <label>
                <span>Shoe milestone</span>
                <strong className={totalRunsAttended >= 4 ? "read-only-field earned-field" : "read-only-field"}>
                  {totalRunsAttended >= 4 ? "New Shoes earned" : `${Math.max(4 - totalRunsAttended, 0)} runs to earn new shoes`}
                </strong>
              </label>
            </>
          )}
          <div className="profile-editor-section">
            <span className="profile-section-label shirts">Shirts</span>
          </div>
          <label>
            <span>Shirt size</span>
            {isEditingProfile ? (
              <select
                value={profileDraft.tshirtSize}
                onChange={(event) => setProfileDraft((current) => ({ ...current, tshirtSize: event.target.value }))}
              >
                {shirtSizeOptions.map((size) => (
                  <option key={size || "blank"} value={size}>{size || "Unknown"}</option>
                ))}
              </select>
            ) : (
              <strong className="read-only-field">{runner.tshirtSize || "Unknown"}</strong>
            )}
          </label>
          <label>
            <span>Shirt received</span>
            {isEditingProfile ? (
              <input
                type="date"
                value={profileDraft.shirtReceivedDate}
                onChange={(event) => setProfileDraft((current) => ({ ...current, shirtReceivedDate: event.target.value }))}
              />
            ) : (
              <strong className="read-only-field">
                {runner.shirtReceivedDate ? formatShortDate(runner.shirtReceivedDate) : "Not received"}
              </strong>
            )}
          </label>
          <div className="profile-editor-section">
            <span className="profile-section-label notes">Notes</span>
          </div>
          <label className="wide-field">
            <span>Memory notes</span>
            {isEditingProfile ? (
              <textarea
                value={profileDraft.notes}
                onChange={(event) => setProfileDraft((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Add memory notes, running history, gear context, or follow-up details..."
                aria-label={`Edit memory notes for ${runnerName(runner)}`}
              />
            ) : (
              <strong className="read-only-field notes-read-only">{runner.notes || "No notes yet."}</strong>
            )}
          </label>
          {profileError && <p className="form-error wide-field">{profileError}</p>}
          {isEditingProfile && (
            <div className="notes-actions">
              <button
                className="secondary-action"
                onClick={() => {
                  setProfileDraft(profileDraftFromRunner(runner));
                  setIsEditingProfile(false);
                  setProfileError("");
                }}
              >
                Cancel
              </button>
              <button
                className="primary-action"
                disabled={isSavingProfile || !profileDraft.firstName.trim()}
                onClick={async () => {
                  setIsSavingProfile(true);
                  setProfileError("");
                  try {
                    await onSaveProfile(runner.id, {
                      firstName: profileDraft.firstName.trim(),
                      lastName: profileDraft.lastName.trim(),
                      status: profileDraft.status,
                      personType: profileDraft.personType,
                      notes: profileDraft.notes.trim(),
                      shoeSize: profileDraft.shoeSize,
                      tshirtSize: profileDraft.tshirtSize,
                      shirtReceivedDate: profileDraft.shirtReceivedDate,
                      dateFirstJoined: automaticFirstJoinedDate ?? "",
                      demoShoesReceivedDate: profileDraft.demoShoesReceivedDate,
                      newShoesReceivedDate: profileDraft.newShoesReceivedDate,
                    });
                    setIsEditingProfile(false);
                  } catch (error) {
                    setProfileError(error instanceof Error ? error.message : "Could not save profile.");
                  } finally {
                    setIsSavingProfile(false);
                  }
                }}
              >
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="profile-section-heading">
          <h4>Attendance History</h4>
        </div>
        <div className="profile-stats history-stats">
          <span><strong>{totalRunsAttended}</strong> Runs</span>
          <span><strong>{automaticFirstJoinedDate ? formatShortDate(automaticFirstJoinedDate) : "Not set"}</strong> First joined</span>
          <span><strong>{lastSeen(state, runner.id)}</strong> Last run</span>
        </div>
        <div className="section-title-row recent-runs-heading">
          <h5>Recent Runs</h5>
          <span className="trend-summary">
            {recentAttendances}/{recentRunTrend.length} attended
          </span>
        </div>
        <div className="attendance-trend" aria-label={`Recent attendance trend for ${runnerName(runner)}`}>
          {recentRunTrend.map(({ run, attended }) => (
            <div
              key={run.id}
              className={attended ? "trend-item present" : "trend-item absent"}
              title={`${formatShortDate(run.date)}: ${attended ? "attended" : "absent"}`}
            >
              <span aria-hidden="true" />
              <small>{formatShortDate(run.date)}</small>
            </div>
          ))}
        </div>
        <div className="trend-legend">
          <span><i className="legend-dot present" /> Present</span>
          <span><i className="legend-dot absent" /> Absent</span>
          <strong>{recentAttendanceRate}% recent rate</strong>
        </div>
      </section>

      <section className="danger-zone">
        {isConfirmingDelete ? (
          <>
            <p>
              Delete {runnerName(runner)}? This removes their profile and attendance history.
            </p>
            <div className="danger-actions">
              <button
                className="secondary-action"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeletingProfile}
              >
                Cancel
              </button>
              <button
                className="danger-action solid"
                disabled={isDeletingProfile}
                onClick={async () => {
                  setIsDeletingProfile(true);
                  try {
                    await onDeleteProfile(runner.id);
                  } finally {
                    setIsDeletingProfile(false);
                  }
                }}
              >
                {isDeletingProfile ? "Deleting..." : "Delete Profile"}
              </button>
            </div>
          </>
        ) : (
          <button className="danger-action" onClick={() => setIsConfirmingDelete(true)}>
            Delete Profile
          </button>
        )}
      </section>
    </aside>
  );
}

function PhotoCropper({
  runner,
  onCancel,
  onSave,
}: {
  runner: Runner;
  onCancel: () => void;
  onSave: (photoUrl: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [source, setSource] = useState("");
  const [zoom, setZoom] = useState(1.25);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function handleFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSource(String(reader.result));
      setZoom(1.25);
      setX(50);
      setY(50);
      setError("");
    };
    reader.onerror = () => setError("Could not read that image.");
    reader.readAsDataURL(file);
  }

  async function createCroppedImage() {
    if (!source) throw new Error("Choose a photo first.");

    const image = new Image();
    image.src = source;
    await image.decode();

    const side = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
    const maxX = image.naturalWidth - side;
    const maxY = image.naturalHeight - side;
    const sx = (maxX * x) / 100;
    const sy = (maxY * y) / 100;
    const outputSize = Math.max(1, Math.min(profilePhotoMaxPixels, Math.floor(side)));

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the crop.");

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", profilePhotoQuality);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      onSave(await createCroppedImage());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not crop that image.");
      setSaving(false);
    }
  }

  const backgroundSize = `${zoom * 100}%`;

  return (
    <div className="photo-modal-backdrop" role="dialog" aria-modal="true" aria-label={`Crop photo for ${runnerName(runner)}`}>
      <section className="photo-modal">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Profile photo</p>
            <h3>{runnerName(runner)}</h3>
          </div>
          <button className="icon-close" onClick={onCancel} aria-label="Close photo editor">×</button>
        </div>

        <div
          className={source ? "crop-preview" : "crop-preview empty"}
          style={
            source
              ? {
                  backgroundImage: `url(${source})`,
                  backgroundPosition: `${x}% ${y}%`,
                  backgroundSize,
                }
              : undefined
          }
        >
          {!source && <span>Choose a photo</span>}
        </div>

        <div className="crop-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <button className="primary-action" onClick={() => cameraInputRef.current?.click()}>
            Take Photo
          </button>
          <button className="secondary-action" onClick={() => fileInputRef.current?.click()}>
            Choose Photo
          </button>
        </div>

        <div className="crop-controls">
          <label>
            <span>Zoom</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
          <label>
            <span>Horizontal</span>
            <input
              type="range"
              min="0"
              max="100"
              value={x}
              onChange={(event) => setX(Number(event.target.value))}
            />
          </label>
          <label>
            <span>Vertical</span>
            <input
              type="range"
              min="0"
              max="100"
              value={y}
              onChange={(event) => setY(Number(event.target.value))}
            />
          </label>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button className="secondary-action" onClick={onCancel}>Cancel</button>
          <button className="primary-action" onClick={save} disabled={!source || saving}>
            {saving ? "Saving..." : "Save Photo"}
          </button>
        </div>
      </section>
    </div>
  );
}

function PeopleSection({
  state,
  selectedRunner,
  selectRunner,
  onEditPhoto,
  onSaveProfile,
  onDeleteProfile,
  isMobileOpen,
  onCloseMobile,
}: {
  state: AppState;
  selectedRunner?: Runner;
  selectRunner: (id: string) => void;
  onEditPhoto: (runner: Runner) => void;
  onSaveProfile: (runnerId: string, updates: Partial<Runner>) => Promise<void>;
  onDeleteProfile: (runnerId: string) => Promise<void>;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<RunnerStatus | "all">("active");
  const [personTypeFilter, setPersonTypeFilter] = useState<PersonType | "all">("all");
  const [query, setQuery] = useState("");
  const cleanQuery = query.trim().toLowerCase();
  const visibleRunners = state.runners.filter((runner) => {
    return (
      (statusFilter === "all" || normalizeRunnerStatus(runner.status) === statusFilter) &&
      (personTypeFilter === "all" || runner.personType === personTypeFilter) &&
      (!cleanQuery ||
        [runnerName(runner), runner.firstName, runner.lastName]
          .join(" ")
          .toLowerCase()
          .includes(cleanQuery))
    );
  });
  const activeCityTeamClients = state.runners.filter(
    (runner) => normalizeRunnerStatus(runner.status) === "active" && runner.personType === "cityteam_client",
  ).length;
  const activeVolunteers = state.runners.filter(
    (runner) => normalizeRunnerStatus(runner.status) === "active" && runner.personType === "volunteer",
  ).length;

  return (
    <div className="people-layout">
      <section className="content-section people-directory-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Photo directory</p>
            <h3>People</h3>
          </div>
          <div className="section-counts" aria-label="Active people summary">
            <span><strong>{activeCityTeamClients}</strong> active CityTeam clients</span>
            <span><strong>{activeVolunteers}</strong> active volunteers</span>
          </div>
        </div>
        <div className="directory-filters">
          <div className="toolbar">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name..."
              aria-label="Search people by name"
            />
          </div>
          <div className="filter-row" aria-label="People status filter">
            {([...statusOptions, "all"] as const).map((status) => (
              <button
                key={status}
                className={statusFilter === status ? "filter active" : "filter"}
                onClick={() => setStatusFilter(status)}
              >
                {status === "all" ? "All" : statusLabels[status]}
              </button>
            ))}
          </div>
          <div className="filter-row" aria-label="People type filter">
            {(["all", "cityteam_client", "volunteer"] as const).map((personType) => (
              <button
                key={personType}
                className={personTypeFilter === personType ? "filter active" : "filter"}
                onClick={() => setPersonTypeFilter(personType)}
              >
                {personType === "all" ? "All Types" : personTypeLabels[personType]}
              </button>
            ))}
          </div>
        </div>
        <div className="people-grid">
          {visibleRunners.map((runner) => (
            <button
              key={runner.id}
              className={["person-card", roleClassName(runner), selectedRunner?.id === runner.id ? "active" : ""].filter(Boolean).join(" ")}
              onClick={() => selectRunner(runner.id)}
            >
              <Avatar runner={runner} />
              <strong>{runnerName(runner)}</strong>
              <small>{personTypeLabels[runner.personType]} | {statusLabels[normalizeRunnerStatus(runner.status)]} | {countAttendance(state, runner.id)} runs</small>
            </button>
          ))}
        </div>
      </section>
      <ProfileCard
        key={profileCardKey(selectedRunner, isMobileOpen)}
        runner={selectedRunner}
        state={state}
        onEditPhoto={onEditPhoto}
        onSaveProfile={onSaveProfile}
        onDeleteProfile={onDeleteProfile}
        isMobileOpen={isMobileOpen}
        onCloseMobile={onCloseMobile}
      />
    </div>
  );
}

function CelebrationPersonRow({
  runner,
  detail,
  metric,
  onOpenProfile,
}: {
  runner: Runner;
  detail: string;
  metric?: string;
  onOpenProfile: (runnerId: string) => void;
}) {
  return (
    <button className={["celebration-person-row", roleClassName(runner)].join(" ")} onClick={() => onOpenProfile(runner.id)}>
      <Avatar runner={runner} />
      <span>
        <strong>{runnerName(runner)}</strong>
        <small>{detail}</small>
      </span>
      {metric && <em>{metric}</em>}
    </button>
  );
}

function CelebrationList({
  title,
  subtitle,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  empty: string;
  children: ReactNode;
}) {
  const childCount = Array.isArray(children) ? children.length : children ? 1 : 0;

  return (
    <article className="celebration-card">
      <div className="celebration-card-head">
        <div>
          <h4>{title}</h4>
          <p>{subtitle}</p>
        </div>
      </div>
      {childCount ? <div className="celebration-list">{children}</div> : <div className="celebration-empty">{empty}</div>}
    </article>
  );
}

function RunDayCelebrationSection({
  state,
  onOpenProfile,
}: {
  state: AppState;
  onOpenProfile: (runnerId: string) => void;
}) {
  const runs = sortedRunsByDate(state);
  const latestRun = runs[runs.length - 1];
  const previousRun = runs[runs.length - 2];
  const cityTeamClients = state.runners.filter((runner) => runner.personType === "cityteam_client");
  const latestAttendance = latestRun
    ? state.attendance.filter((item) => item.runId === latestRun.id && item.attended)
    : [];
  const latestAttendeeIds = new Set(latestAttendance.map((item) => item.runnerId));
  const previousAttendeeIds = new Set(
    previousRun
      ? state.attendance
          .filter((item) => item.runId === previousRun.id && item.attended)
          .map((item) => item.runnerId)
      : [],
  );
  const topStreaks = cityTeamClients
    .map((runner) => ({
      runner,
      streak: currentRunStreak(state, runner.id, runs),
      runsAttended: countAttendance(state, runner.id),
    }))
    .filter((item) => item.streak > 0)
    .sort((a, b) => b.streak - a.streak || b.runsAttended - a.runsAttended || runnerName(a.runner).localeCompare(runnerName(b.runner)))
    .slice(0, 5);
  const latestClientAttendees = cityTeamClients.filter((runner) => latestAttendeeIds.has(runner.id));
  const shoeEarners = latestRun
    ? latestClientAttendees.filter((runner) => attendanceCountThroughRun(state, runner.id, latestRun.id, runs) === 4)
    : [];
  const shirtEarners = latestRun
    ? latestClientAttendees.filter((runner) => attendanceCountThroughRun(state, runner.id, latestRun.id, runs) === 2)
    : [];
  const comebacks = latestRun
    ? latestClientAttendees.filter((runner) => {
        if (!previousRun || previousAttendeeIds.has(runner.id)) return false;
        return runs
          .filter((run) => run.date < latestRun.date)
          .some((run) =>
            state.attendance.some((item) => item.runnerId === runner.id && item.runId === run.id && item.attended),
          );
      })
    : [];

  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Latest run</p>
          <h3>Run Day Celebration</h3>
          <small>{latestRun ? `${latestRun.title} | ${formatShortDate(latestRun.date)}` : "No saved runs yet"}</small>
        </div>
      </div>

      <div className="celebration-grid">
        <CelebrationList
          title="Top 5 Streaks"
          subtitle="CityTeam clients with the longest current run-day streaks."
          empty="No active CityTeam client streaks yet."
        >
          {topStreaks.map(({ runner, streak }) => (
            <CelebrationPersonRow
              key={runner.id}
              runner={runner}
              detail={`${countAttendance(state, runner.id)} total runs`}
              metric={`${streak} in a row`}
              onOpenProfile={onOpenProfile}
            />
          ))}
        </CelebrationList>

        <CelebrationList
          title="Shoes Earned"
          subtitle="CityTeam clients whose fourth run was the latest run."
          empty="No new shoe milestones on the latest run."
        >
          {shoeEarners.map((runner) => (
            <CelebrationPersonRow
              key={runner.id}
              runner={runner}
              detail="Fourth run milestone"
              metric="Shoes"
              onOpenProfile={onOpenProfile}
            />
          ))}
        </CelebrationList>

        <CelebrationList
          title="T-Shirts Earned"
          subtitle="CityTeam clients whose second run was the latest run."
          empty="No new T-shirt milestones on the latest run."
        >
          {shirtEarners.map((runner) => (
            <CelebrationPersonRow
              key={runner.id}
              runner={runner}
              detail="Second run milestone"
              metric="T-shirt"
              onOpenProfile={onOpenProfile}
            />
          ))}
        </CelebrationList>

        <CelebrationList
          title="Comebacks"
          subtitle="CityTeam clients who returned on the latest run after missing the prior run."
          empty="No comebacks on the latest run."
        >
          {comebacks.map((runner) => (
            <CelebrationPersonRow
              key={runner.id}
              runner={runner}
              detail={previousRun ? `Missed ${formatShortDate(previousRun.date)}, back ${formatShortDate(latestRun.date)}` : "Back at the latest run"}
              metric="Back"
              onOpenProfile={onOpenProfile}
            />
          ))}
        </CelebrationList>
      </div>
    </section>
  );
}

function AttendanceTrendChart({ state }: { state: AppState }) {
  const runs = state.runs.slice().sort((a, b) => a.date.localeCompare(b.date));
  const runnerById = new Map(state.runners.map((runner) => [runner.id, runner]));
  const points = runs.map((run) => {
    const records = state.attendance.filter((item) => item.runId === run.id && item.attended);
    const { clients, volunteers, total } = attendanceRoleCounts(records, runnerById);

    return {
      run,
      clients,
      volunteers,
      total,
    };
  });
  const width = 920;
  const height = 360;
  const chart = { left: 58, right: 28, top: 40, bottom: 72 };
  const innerWidth = width - chart.left - chart.right;
  const innerHeight = height - chart.top - chart.bottom;
  const maxCount = Math.max(1, ...points.flatMap((point) => [point.clients, point.volunteers, point.total]));
  const roundedMax = Math.max(4, Math.ceil(maxCount / 4) * 4);
  const yTicks = [0, roundedMax / 4, roundedMax / 2, (roundedMax * 3) / 4, roundedMax];
  const xFor = (index: number) =>
    chart.left + (points.length <= 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  const yFor = (value: number) => chart.top + innerHeight - (value / roundedMax) * innerHeight;
  const pathFor = (key: "clients" | "volunteers") =>
    points.map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(point[key])}`).join(" ");
  const areaFor = (key: "clients" | "volunteers") => {
    if (!points.length) return "";
    const firstX = xFor(0);
    const lastX = xFor(points.length - 1);
    return `${pathFor(key)} L ${lastX} ${yFor(0)} L ${firstX} ${yFor(0)} Z`;
  };

  if (!points.length) {
    return (
      <div className="trend-chart-card empty">
        <p>No runs yet.</p>
      </div>
    );
  }

  return (
    <div className="trend-chart-card">
      <div className="trend-chart-head">
        <div>
          <p className="eyebrow">Attendance trend</p>
          <h4>CityTeam Clients and Volunteers</h4>
        </div>
        <div className="chart-legend" aria-label="Chart legend">
          <span><i className="legend-line clients" /> CityTeam runners</span>
          <span><i className="legend-line volunteers" /> Volunteers</span>
        </div>
      </div>

      <div className="line-chart-shell" role="img" aria-label="Attendance trend by date for CityTeam runners and volunteers">
        <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
          <defs>
            <linearGradient id="clientsArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#24785f" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#24785f" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="volunteersArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#c89b3c" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#c89b3c" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width={width} height={height} rx="8" className="chart-bg" />
          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={chart.left} x2={width - chart.right} y1={yFor(tick)} y2={yFor(tick)} className="chart-grid" />
              <text x={chart.left - 14} y={yFor(tick) + 4} className="chart-axis-label" textAnchor="end">
                {Math.round(tick)}
              </text>
            </g>
          ))}

          <path d={areaFor("clients")} fill="url(#clientsArea)" />
          <path d={areaFor("volunteers")} fill="url(#volunteersArea)" />
          <path d={pathFor("clients")} className="chart-line clients" />
          <path d={pathFor("volunteers")} className="chart-line volunteers" />

          {points.map((point, index) => {
            const x = xFor(index);
            const clientY = yFor(point.clients);
            const volunteerY = yFor(point.volunteers);
            return (
              <g key={point.run.id}>
                <line x1={x} x2={x} y1={chart.top} y2={height - chart.bottom} className="chart-date-guide" />
                <circle cx={x} cy={clientY} r="6" className="chart-dot clients" />
                <circle cx={x} cy={volunteerY} r="6" className="chart-dot volunteers" />
                <text x={x} y={Math.max(18, clientY - 15)} className="chart-value-label clients" textAnchor="middle">
                  {point.clients}
                </text>
                <text x={x} y={Math.min(height - chart.bottom - 8, volunteerY + 27)} className="chart-value-label volunteers" textAnchor="middle">
                  {point.volunteers}
                </text>
                <text x={x} y={height - 32} className="chart-date-label" textAnchor="middle">
                  {formatShortDate(point.run.date)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function ClientRetentionTrendChart({ state }: { state: AppState }) {
  const runs = state.runs.slice().sort((a, b) => a.date.localeCompare(b.date));
  const clientById = new Map(
    state.runners
      .filter((runner) => runner.personType === "cityteam_client")
      .map((runner) => [runner.id, runner]),
  );
  const firstRunByClientId = new Map<string, string>();

  for (const run of runs) {
    const clientAttendance = state.attendance.filter(
      (item) => item.runId === run.id && item.attended && clientById.has(item.runnerId),
    );

    for (const record of clientAttendance) {
      if (!firstRunByClientId.has(record.runnerId)) {
        firstRunByClientId.set(record.runnerId, run.id);
      }
    }
  }

  const points = runs.map((run) => {
    const clientAttendance = state.attendance.filter(
      (item) => item.runId === run.id && item.attended && clientById.has(item.runnerId),
    );
    const firstTime = clientAttendance.filter((item) => firstRunByClientId.get(item.runnerId) === run.id).length;
    const returning = clientAttendance.length - firstTime;

    return {
      run,
      firstTime,
      returning,
      total: clientAttendance.length,
    };
  });
  const width = 920;
  const height = 360;
  const chart = { left: 58, right: 28, top: 40, bottom: 72 };
  const innerWidth = width - chart.left - chart.right;
  const innerHeight = height - chart.top - chart.bottom;
  const maxCount = Math.max(1, ...points.flatMap((point) => [point.firstTime, point.returning, point.total]));
  const roundedMax = Math.max(4, Math.ceil(maxCount / 4) * 4);
  const yTicks = [0, roundedMax / 4, roundedMax / 2, (roundedMax * 3) / 4, roundedMax];
  const xFor = (index: number) =>
    chart.left + (points.length <= 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  const yFor = (value: number) => chart.top + innerHeight - (value / roundedMax) * innerHeight;
  const pathFor = (key: "firstTime" | "returning") =>
    points.map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(point[key])}`).join(" ");

  if (!points.length) {
    return (
      <div className="trend-chart-card empty">
        <p>No CityTeam client attendance yet.</p>
      </div>
    );
  }

  return (
    <div className="trend-chart-card retention-chart-card">
      <div className="trend-chart-head">
        <div>
          <p className="eyebrow">CityTeam client retention</p>
          <h4>First-Time and Returning Runners</h4>
        </div>
        <div className="chart-legend" aria-label="Chart legend">
          <span><i className="legend-line first-time" /> First-time</span>
          <span><i className="legend-line returning" /> Returning</span>
        </div>
      </div>

      <div className="line-chart-shell" role="img" aria-label="CityTeam client first-time and returning attendance by date">
        <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
          <rect x="0" y="0" width={width} height={height} rx="8" className="chart-bg" />
          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={chart.left} x2={width - chart.right} y1={yFor(tick)} y2={yFor(tick)} className="chart-grid" />
              <text x={chart.left - 14} y={yFor(tick) + 4} className="chart-axis-label" textAnchor="end">
                {Math.round(tick)}
              </text>
            </g>
          ))}

          <path d={pathFor("firstTime")} className="chart-line first-time" />
          <path d={pathFor("returning")} className="chart-line returning" />

          {points.map((point, index) => {
            const x = xFor(index);
            const firstTimeY = yFor(point.firstTime);
            const returningY = yFor(point.returning);
            return (
              <g key={point.run.id}>
                <line x1={x} x2={x} y1={chart.top} y2={height - chart.bottom} className="chart-date-guide" />
                <circle cx={x} cy={firstTimeY} r="6" className="chart-dot first-time" />
                <circle cx={x} cy={returningY} r="6" className="chart-dot returning" />
                <text x={x} y={Math.max(18, firstTimeY - 15)} className="chart-value-label first-time" textAnchor="middle">
                  {point.firstTime}
                </text>
                <text x={x} y={Math.min(height - chart.bottom - 8, returningY + 27)} className="chart-value-label returning" textAnchor="middle">
                  {point.returning}
                </text>
                <text x={x} y={height - 32} className="chart-date-label" textAnchor="middle">
                  {formatShortDate(point.run.date)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function AttendanceLeaderboard({
  state,
  onOpenProfile,
}: {
  state: AppState;
  onOpenProfile: (runnerId: string) => void;
}) {
  const [leaderboardScope, setLeaderboardScope] = useState<"active" | "all">("active");
  const leaders = state.runners
    .filter((runner) => runner.personType === "cityteam_client")
    .filter((runner) => leaderboardScope === "all" || normalizeRunnerStatus(runner.status) === "active")
    .map((runner) => ({
      runner,
      runsAttended: countAttendance(state, runner.id),
    }))
    .filter((entry) => entry.runsAttended > 0)
    .sort((a, b) => b.runsAttended - a.runsAttended || runnerName(a.runner).localeCompare(runnerName(b.runner)))
    .slice(0, 10);

  return (
    <div className="leaderboard-card">
      <div className="leaderboard-head">
        <div>
          <p className="eyebrow">Leaderboard</p>
          <h4>{leaderboardScope === "active" ? "Active CityTeam Clients" : "All CityTeam Clients"}</h4>
        </div>
        <div className="leaderboard-tools">
          <div className="leaderboard-toggle" aria-label="Leaderboard scope">
            <button
              className={leaderboardScope === "active" ? "active" : ""}
              onClick={() => setLeaderboardScope("active")}
            >
              Active
            </button>
            <button
              className={leaderboardScope === "all" ? "active" : ""}
              onClick={() => setLeaderboardScope("all")}
            >
              All CityTeam Clients
            </button>
          </div>
          <span className="shirt-key"><span aria-hidden="true">👕</span> Second run earns T-shirt</span>
          <span className="shoe-key"><span aria-hidden="true">✨👟</span> Fourth run earns new shoes</span>
        </div>
      </div>
      {leaders.length ? (
        <div className="leaderboard-list">
          {leaders.map(({ runner, runsAttended }, index) => {
            const earnedShirt = runsAttended >= 2;
            const earnedShoes = runsAttended >= 4;
            const receivedShirt = Boolean(runner.shirtReceivedDate);
            const receivedShoes = Boolean(runner.newShoesReceivedDate);
            const shoeRuns = Array.from({ length: runsAttended }, (_, runIndex) => runIndex + 1);
            return (
              <article key={runner.id} className={["leaderboard-row", roleClassName(runner), earnedShoes ? "earned" : ""].filter(Boolean).join(" ")}>
                <span className="leaderboard-rank">{index + 1}</span>
                <button
                  className="leaderboard-profile-trigger avatar-trigger"
                  onClick={() => onOpenProfile(runner.id)}
                  title={`Open ${runnerName(runner)}'s profile`}
                  aria-label={`Open ${runnerName(runner)} profile`}
                >
                  <Avatar runner={runner} />
                </button>
                <div className="leaderboard-person">
                  <button
                    className="leaderboard-profile-trigger name-trigger"
                    onClick={() => onOpenProfile(runner.id)}
                    title={`Open ${runnerName(runner)}'s profile`}
                  >
                    {runnerName(runner)}
                  </button>
                  <small>{statusLabels[normalizeRunnerStatus(runner.status)]} CityTeam Client</small>
                  <div className="shoe-run-chart" aria-label={`${runnerName(runner)} has attended ${runsAttended} runs`}>
                    {shoeRuns.map((runNumber) => (
                      <span
                        key={runNumber}
                        className={runNumber === 4 ? "shoe-run earned" : runNumber === 2 ? "shoe-run shirt-earned" : "shoe-run"}
                        title={
                          runNumber === 4
                            ? "Fourth run: New shoes earned"
                            : runNumber === 2
                              ? "Second run: T-shirt earned"
                              : `Run ${runNumber}`
                        }
                        aria-label={
                          runNumber === 4
                            ? "Fourth run: New shoes earned"
                            : runNumber === 2
                              ? "Second run: T-shirt earned"
                              : `Run ${runNumber}`
                        }
                      >
                        <span aria-hidden="true">{runNumber === 4 ? "✨👟" : runNumber === 2 ? "👕" : "👟"}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="leaderboard-score">
                  <strong>{runsAttended}</strong>
                  <small>{runsAttended === 1 ? "run" : "runs"}</small>
                </div>
                {(earnedShirt || earnedShoes) && (
                  <div className="leaderboard-awards">
                    {earnedShirt && (
                      <span
                        className={receivedShirt ? "shirt-earned-pill received" : "shirt-earned-pill"}
                        title={receivedShirt && runner.shirtReceivedDate ? `Received ${formatShortDate(runner.shirtReceivedDate)}` : "T-shirt earned"}
                      >
                        <span aria-hidden="true">👕</span>
                        {receivedShirt ? "T-shirt received" : "T-shirt earned"}
                      </span>
                    )}
                    {earnedShoes && (
                      <span
                        className={receivedShoes ? "shoe-earned-pill received" : "shoe-earned-pill"}
                        title={receivedShoes && runner.newShoesReceivedDate ? `Received ${formatShortDate(runner.newShoesReceivedDate)}` : "New shoes earned"}
                      >
                        <span aria-hidden="true">✨👟</span>
                        {receivedShoes ? "New shoes received" : "New Shoes earned"}
                      </span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="leaderboard-empty">
          <p>
            No {leaderboardScope === "active" ? "active " : ""}CityTeam client attendance yet.
          </p>
        </div>
      )}
    </div>
  );
}

function RunsSection({
  state,
  onToggleAttendance,
  onDeleteRun,
  onOpenProfile,
}: {
  state: AppState;
  onToggleAttendance: (runnerId: string, runId: string, attended: boolean) => Promise<void>;
  onDeleteRun: (runId: string) => Promise<void>;
  onOpenProfile: (runnerId: string) => void;
}) {
  const [editingRunId, setEditingRunId] = useState("");
  const [confirmingDeleteRunId, setConfirmingDeleteRunId] = useState("");
  const [showAttendanceHistory, setShowAttendanceHistory] = useState(false);
  const runners = state.runners.slice().sort((a, b) => runnerName(a).localeCompare(runnerName(b)));
  const runnerById = new Map(state.runners.map((runner) => [runner.id, runner]));
  const sortedRuns = state.runs.slice().sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Attendance history</p>
          <h3>Trends</h3>
        </div>
      </div>
      <AttendanceTrendChart state={state} />
      <ClientRetentionTrendChart state={state} />
      <AttendanceLeaderboard state={state} onOpenProfile={onOpenProfile} />
      <div className="collapsible-section-head">
        <div>
          <p className="eyebrow">Run records</p>
          <h4>Attendance Details</h4>
          <small>{sortedRuns.length} saved {sortedRuns.length === 1 ? "run" : "runs"}</small>
        </div>
        <button
          className="secondary-action"
          onClick={() => {
            setShowAttendanceHistory((current) => !current);
            setEditingRunId("");
            setConfirmingDeleteRunId("");
          }}
        >
          {showAttendanceHistory ? "Collapse" : "Show Details"}
        </button>
      </div>
      {showAttendanceHistory && (
        <div className="table-list">
          {sortedRuns.map((run) => {
            const records = state.attendance.filter((item) => item.runId === run.id && item.attended);
            const attendanceCounts = attendanceRoleCounts(records, runnerById);
            const isEditing = editingRunId === run.id;
            const isConfirmingDelete = confirmingDeleteRunId === run.id;
            return (
              <article key={run.id} className="run-history-card">
                <div className="table-row run-row">
                  <span>
                    <strong>{run.title}</strong>
                    <small>{formatShortDate(run.date)}</small>
                  </span>
                  <span>{attendanceCounts.clients} runners</span>
                  <span>{attendanceCounts.volunteers} volunteers</span>
                  <div className="run-row-actions">
                    <button
                      className="text-action"
                      onClick={() => {
                        setEditingRunId(isEditing ? "" : run.id);
                        setConfirmingDeleteRunId("");
                      }}
                    >
                      {isEditing ? "Done" : "Edit Attendance"}
                    </button>
                    <button
                      className="danger-action"
                      onClick={() => {
                        setConfirmingDeleteRunId(isConfirmingDelete ? "" : run.id);
                        setEditingRunId("");
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {isConfirmingDelete && (
                  <div className="delete-confirmation">
                    <span>
                      Delete {run.title}? This removes the run and all attendance for {formatShortDate(run.date)}.
                    </span>
                    <div>
                      <button className="secondary-action" onClick={() => setConfirmingDeleteRunId("")}>
                        Cancel
                      </button>
                      <button
                        className="danger-action solid"
                        onClick={async () => {
                          setConfirmingDeleteRunId("");
                          await onDeleteRun(run.id);
                        }}
                      >
                        Delete Run
                      </button>
                    </div>
                  </div>
                )}
                {isEditing && (
                  <div className="attendance-editor">
                    {runners.map((runner) => {
                      const existing = state.attendance.find(
                        (item) => item.runnerId === runner.id && item.runId === run.id,
                      );
                      const checked = Boolean(existing?.attended);
                      return (
                        <label
                          key={runner.id}
                          className={[
                            "attendance-edit-row",
                            roleClassName(runner),
                            checked ? "checked" : "",
                          ].filter(Boolean).join(" ")}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => onToggleAttendance(runner.id, run.id, event.target.checked)}
                          />
                          <Avatar runner={runner} />
                          <span>
                            <strong>{runnerName(runner)}</strong>
                            <small>{personTypeLabels[runner.personType]} | {statusLabels[normalizeRunnerStatus(runner.status)]}</small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function UpcomingRunsSection({
  state,
  onCreateRun,
  onUpdateRunTitle,
  onToggleVolunteer,
  onSetSnackVolunteer,
  onDeleteRun,
}: {
  state: AppState;
  onCreateRun: (date: string, title?: string) => Promise<void>;
  onUpdateRunTitle: (upcomingRunId: string, title: string) => Promise<void>;
  onToggleVolunteer: (upcomingRunId: string, runnerId: string, attending: boolean, note?: string) => Promise<void>;
  onSetSnackVolunteer: (upcomingRunId: string, runnerId: string) => Promise<void>;
  onDeleteRun: (upcomingRunId: string) => Promise<void>;
}) {
  const [runDate, setRunDate] = useState(nextSaturdayDate());
  const [runTitle, setRunTitle] = useState("");
  const [expandedRunId, setExpandedRunId] = useState("");
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});
  const [declineNotes, setDeclineNotes] = useState<Record<string, string>>({});
  const [savingTitleId, setSavingTitleId] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const activeVolunteers = state.runners
    .filter((runner) => runner.personType === "volunteer" && normalizeRunnerStatus(runner.status) === "active")
    .sort((a, b) => runnerName(a).localeCompare(runnerName(b)));
  const upcomingRuns = state.upcomingRuns
    .filter((run) => run.date >= todayDate())
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Planning</p>
          <h3>Upcoming Runs</h3>
        </div>
        <div className="section-counts" aria-label="Upcoming run summary">
          <span><strong>{upcomingRuns.length}</strong> scheduled</span>
          <span><strong>{activeVolunteers.length}</strong> active volunteers</span>
        </div>
      </div>

      <div className="upcoming-run-form">
        <label>
          <span>Run date</span>
          <input
            type="date"
            value={runDate}
            onChange={(event) => setRunDate(event.target.value)}
          />
        </label>
        <label>
          <span>Title</span>
          <input
            value={runTitle}
            onChange={(event) => setRunTitle(event.target.value)}
            placeholder={`${formatShortDate(runDate)} Run`}
          />
        </label>
        <button
          className="primary-action"
          disabled={!runDate || savingDate}
          onClick={async () => {
            setSavingDate(true);
            try {
              await onCreateRun(runDate, runTitle);
              setExpandedRunId(`upcoming-${runDate}`);
              setRunDate(nextSaturdayDate(new Date(`${runDate}T12:00:00`)));
              setRunTitle("");
            } finally {
              setSavingDate(false);
            }
          }}
        >
          {savingDate ? "Saving..." : "Add Run Date"}
        </button>
      </div>

      <div className="upcoming-run-list">
        {upcomingRuns.length ? (
          upcomingRuns.map((run) => {
            const volunteerRecords = state.upcomingRunVolunteers.filter(
              (item) => item.upcomingRunId === run.id && item.attending,
            );
            const snackVolunteer = activeVolunteers.find((volunteer) => volunteer.id === run.snackRunnerId);
            const isExpanded = expandedRunId === run.id;
            const titleDraft = titleDrafts[run.id] ?? run.title;
            return (
              <article key={run.id} className={isExpanded ? "upcoming-run-card expanded" : "upcoming-run-card"}>
                <div className="upcoming-run-head">
                  <span>
                    <strong>{run.title}</strong>
                    <small>{formatShortDate(run.date)}</small>
                  </span>
                  <div className="summary-pills">
                    <span>{volunteerRecords.length} attending</span>
                    <span>{snackVolunteer ? `${runnerName(snackVolunteer)} snacks` : "Snacks open"}</span>
                  </div>
                  <button
                    className="text-action"
                    onClick={() => setExpandedRunId(isExpanded ? "" : run.id)}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? "Collapse" : "Details"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="upcoming-run-details">
                    <div className="upcoming-title-editor">
                      <label>
                        <span>Run title</span>
                        <input
                          value={titleDraft}
                          onChange={(event) => setTitleDrafts((current) => ({ ...current, [run.id]: event.target.value }))}
                          placeholder="Saturday Run, 5K Race, Shoe Demo..."
                        />
                      </label>
                      <button
                        className="secondary-action"
                        disabled={!titleDraft.trim() || savingTitleId === run.id}
                        onClick={async () => {
                          setSavingTitleId(run.id);
                          try {
                            await onUpdateRunTitle(run.id, titleDraft);
                          } finally {
                            setSavingTitleId("");
                          }
                        }}
                      >
                        {savingTitleId === run.id ? "Saving..." : "Save Title"}
                      </button>
                    </div>

                    <label className="snack-select">
                      <span>Snack volunteer</span>
                      <select
                        value={run.snackRunnerId ?? ""}
                        onChange={(event) => onSetSnackVolunteer(run.id, event.target.value)}
                      >
                        <option value="">No one yet</option>
                        {activeVolunteers.map((volunteer) => (
                          <option key={volunteer.id} value={volunteer.id}>
                            {runnerName(volunteer)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="volunteer-rsvp-grid" aria-label={`Volunteer RSVPs for ${run.title}`}>
                      {activeVolunteers.map((volunteer) => {
                        const response = state.upcomingRunVolunteers.find(
                          (item) => item.upcomingRunId === run.id && item.runnerId === volunteer.id,
                        );
                        const noteKey = `${run.id}-${volunteer.id}`;
                        const noteDraft = declineNotes[noteKey] ?? response?.note ?? "";
                        const statusLabel = response
                          ? response.attending
                            ? "Attending"
                            : response.note
                              ? `Declined: ${response.note}`
                              : "Declined"
                          : "Not marked";
                        return (
                          <div
                            key={volunteer.id}
                            className={
                              response?.attending
                                ? "volunteer-rsvp checked"
                                : response
                                  ? "volunteer-rsvp declined"
                                  : "volunteer-rsvp"
                            }
                          >
                            <Avatar runner={volunteer} />
                            <span>
                              <strong>{runnerName(volunteer)}</strong>
                              <small>{statusLabel}</small>
                            </span>
                            <div className="rsvp-actions">
                              <button
                                className={response?.attending ? "rsvp-action active" : "rsvp-action"}
                                onClick={() => onToggleVolunteer(run.id, volunteer.id, true)}
                              >
                                Attending
                              </button>
                              <button
                                className={response && !response.attending ? "rsvp-action decline active" : "rsvp-action decline"}
                                onClick={() => onToggleVolunteer(run.id, volunteer.id, false, noteDraft)}
                              >
                                Decline
                              </button>
                            </div>
                            {response && !response.attending && (
                              <label className="decline-note">
                                <span>Decline note</span>
                                <textarea
                                  value={noteDraft}
                                  onChange={(event) => setDeclineNotes((current) => ({ ...current, [noteKey]: event.target.value }))}
                                  onBlur={(event) => onToggleVolunteer(run.id, volunteer.id, false, event.target.value)}
                                  placeholder="Optional note..."
                                />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="upcoming-run-actions">
                      <button className="danger-action" onClick={() => onDeleteRun(run.id)}>
                        Delete Upcoming Run
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <div className="empty-state">
            <strong>No upcoming runs yet</strong>
            <span>Add the next Saturday run date to start collecting volunteer RSVPs.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function SettingsSection() {
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Production setup</p>
          <h3>Supabase Backend</h3>
        </div>
      </div>
      <div className="setup-panel">
        <p>
          This app stores runner profiles, runs, attendance, admins, and gear fields in Supabase.
          Add your project URL as <code>NEXT_PUBLIC_SUPABASE_URL</code> and your publishable key as{" "}
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>.
        </p>
        <p>
          Until those values are configured, the app runs in demo mode so the check-in flow,
          profiles and runs can be reviewed safely.
        </p>
        <p>
          Optional: set <code>NEXT_PUBLIC_RUN_CLUB_ADMINS</code> to a comma-separated list like{" "}
          <code>Kevin,Saturday lead</code>. If the Supabase <code>admins</code> table has active
          rows, those names are used instead.
        </p>
        <p>
          Upcoming Runs needs the <code>upcoming_runs</code> and{" "}
          <code>upcoming_run_volunteers</code> tables. Run the SQL in{" "}
          <code>supabase-upcoming-runs.sql</code> in Supabase before using this section live.
        </p>
        <p>
          Profile shoe and join dates need the columns in{" "}
          <code>supabase-profile-fields.sql</code>.
        </p>
      </div>
    </section>
  );
}
