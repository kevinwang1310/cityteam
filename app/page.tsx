"use client";

import { useEffect, useMemo, useState } from "react";

type RunnerStatus = "active" | "inactive" | "exited";
type Section = "checkin" | "people" | "runs" | "reports" | "gear" | "settings";

type Runner = {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  photoUrl?: string;
  status: RunnerStatus;
  teamRole?: string;
  notes?: string;
  attendanceUpdates?: string;
  shoeSize?: string;
  demoShoes?: boolean;
  tshirtSize?: string;
  oldTshirtSize?: string;
  shirtReceivedDate?: string;
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

type AppState = {
  runners: Runner[];
  runs: Run[];
  attendance: Attendance[];
  admins: string[];
  syncedAt?: string;
};

const SHEETS_API_URL = process.env.NEXT_PUBLIC_SHEETS_API_URL ?? "";
const SHEETS_API_KEY = process.env.NEXT_PUBLIC_SHEETS_API_KEY ?? "";

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
      teamRole: "Director of Facilities",
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
      teamRole: "CMO",
      shoeSize: "11",
      demoShoes: true,
      tshirtSize: "L",
      notes: "half ironman",
    },
    {
      id: "duy-tran",
      firstName: "Duy",
      lastName: "Tran",
      status: "inactive",
      teamRole: "CIO",
      shoeSize: "10",
      demoShoes: true,
      tshirtSize: "L",
      oldTshirtSize: "XL",
      notes: "D is silent, You-Eee, IT, 3 daughters, Cupertino, OC mom",
      attendanceUpdates: "Working Saturdays now, cannot run",
    },
    {
      id: "chuck-eissler",
      firstName: "Chuck",
      lastName: "Eissler",
      status: "exited",
      shoeSize: "12",
      tshirtSize: "3XL",
      notes: "Bigger, tie-dye shirt",
      attendanceUpdates: "Left program 8/1",
    },
    {
      id: "will-wells",
      firstName: "Will",
      lastName: "Wells",
      status: "active",
      teamRole: "Team Physician",
      shoeSize: "13",
      demoShoes: true,
      notes: "Yellow shirt, CrossFit Milpitas, met wife",
    },
    {
      id: "hayden-h",
      firstName: "Hayden",
      lastName: "H",
      status: "active",
      shoeSize: "15",
      tshirtSize: "2XL",
      oldTshirtSize: "XL",
      shirtReceivedDate: "2026-07-11",
      notes: "Tall, grew up in San Jose",
      attendanceUpdates: "New 6/20",
    },
    {
      id: "bryan",
      firstName: "Bryan",
      lastName: "",
      status: "active",
      shoeSize: "8",
      tshirtSize: "XL",
      notes: "Boxer, wrist push-ups, Lychee",
    },
    {
      id: "refugio-adrian",
      firstName: "Refugio",
      lastName: "",
      nickname: "Adrian",
      status: "active",
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
};

const sections: { id: Section; label: string }[] = [
  { id: "checkin", label: "Check In" },
  { id: "people", label: "People" },
  { id: "runs", label: "Runs" },
  { id: "reports", label: "Reports" },
  { id: "gear", label: "Gear" },
];

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function todayId() {
  const now = new Date();
  return `run-${now.toISOString().slice(0, 10)}`;
}

function runnerName(runner: Runner) {
  const full = `${runner.firstName} ${runner.lastName}`.trim();
  return runner.nickname ? `${full} "${runner.nickname}"` : full;
}

function initials(runner: Runner) {
  return `${runner.firstName[0] ?? ""}${runner.lastName[0] ?? ""}`.toUpperCase();
}

function countAttendance(state: AppState, runnerId: string) {
  return state.attendance.filter((item) => item.runnerId === runnerId && item.attended).length;
}

function countVolunteered(state: AppState, runnerId: string) {
  return state.attendance.filter((item) => item.runnerId === runnerId && item.wasVolunteer).length;
}

function lastSeen(state: AppState, runnerId: string) {
  const runDates = state.attendance
    .filter((item) => item.runnerId === runnerId && item.attended)
    .map((item) => state.runs.find((run) => run.id === item.runId)?.date)
    .filter(Boolean)
    .sort() as string[];

  return runDates.length ? formatShortDate(runDates[runDates.length - 1]) : "Never";
}

async function callSheets(action: string, payload: Record<string, unknown> = {}) {
  if (!SHEETS_API_URL) {
    throw new Error("Google Sheets API URL is not configured.");
  }

  const response = await fetch(SHEETS_API_URL, {
    method: "POST",
    body: JSON.stringify({
      action,
      apiKey: SHEETS_API_KEY,
      ...payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Sheets request failed with ${response.status}.`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

export default function Home() {
  const [state, setState] = useState<AppState>(demoState);
  const [section, setSection] = useState<Section>("checkin");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RunnerStatus | "all">("active");
  const [selectedRunnerId, setSelectedRunnerId] = useState<string>(demoState.runners[1].id);
  const [todayRunId, setTodayRunId] = useState(todayId());
  const [adminName, setAdminName] = useState(demoState.admins[0]);
  const [connectionState, setConnectionState] = useState<"demo" | "loading" | "connected" | "error">(
    SHEETS_API_URL ? "loading" : "demo",
  );
  const [message, setMessage] = useState(SHEETS_API_URL ? "Connecting to Google Sheets..." : "Demo mode. Add the Apps Script URL to save changes to Sheets.");
  const [newRunnerOpen, setNewRunnerOpen] = useState(false);
  const [newRunner, setNewRunner] = useState({ firstName: "", lastName: "", notes: "" });

  useEffect(() => {
    async function load() {
      if (!SHEETS_API_URL) return;
      try {
        const data = await callSheets("state");
        const incoming = data.state as AppState;
        const today = data.todayRunId || todayId();
        setState(incoming);
        setTodayRunId(today);
        setSelectedRunnerId(incoming.runners[0]?.id ?? "");
        setAdminName(incoming.admins[0] ?? "Admin");
        setConnectionState("connected");
        setMessage("Connected to Google Sheets.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Could not connect to Google Sheets.");
      }
    }

    load();
  }, []);

  const todayRun = useMemo(() => {
    const existing = state.runs.find((run) => run.id === todayRunId);
    if (existing) return existing;
    const date = new Date().toISOString().slice(0, 10);
    return { id: todayRunId, date, title: "Today&apos;s Run" };
  }, [state.runs, todayRunId]);

  const todayAttendance = useMemo(
    () => state.attendance.filter((item) => item.runId === todayRunId && item.attended),
    [state.attendance, todayRunId],
  );

  const filteredRunners = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return state.runners
      .filter((runner) => statusFilter === "all" || runner.status === statusFilter)
      .filter((runner) => {
        if (!clean) return true;
        return [
          runner.firstName,
          runner.lastName,
          runner.nickname,
          runner.teamRole,
          runner.notes,
          runner.tshirtSize,
          runner.shoeSize,
        ]
          .join(" ")
          .toLowerCase()
          .includes(clean);
      })
      .sort((a, b) => Number(isCheckedIn(b.id)) - Number(isCheckedIn(a.id)) || runnerName(a).localeCompare(runnerName(b)));
  }, [query, state.runners, statusFilter, state.attendance, todayRunId]);

  const selectedRunner = state.runners.find((runner) => runner.id === selectedRunnerId) ?? state.runners[0];

  const report = useMemo(() => {
    const active = state.runners.filter((runner) => runner.status === "active");
    const uniqueThisMonth = new Set(
      state.attendance
        .filter((item) => {
          const run = state.runs.find((candidate) => candidate.id === item.runId);
          return item.attended && run?.date.startsWith("2026-08");
        })
        .map((item) => item.runnerId),
    );
    const firstTimers = todayAttendance.filter((item) => countAttendance(state, item.runnerId) === 1).length;
    const notSeen60 = active.filter((runner) => {
      const last = state.attendance
        .filter((item) => item.runnerId === runner.id && item.attended)
        .map((item) => state.runs.find((run) => run.id === item.runId)?.date)
        .filter(Boolean)
        .sort()
        .pop();
      if (!last) return true;
      const days = (Date.now() - new Date(`${last}T12:00:00`).getTime()) / 86_400_000;
      return days > 60;
    }).length;

    return {
      activeCount: active.length,
      checkedIn: todayAttendance.length,
      volunteersToday: todayAttendance.filter((item) => item.wasVolunteer).length,
      uniqueThisMonth: uniqueThisMonth.size,
      firstTimers,
      notSeen60,
      missingPhotos: state.runners.filter((runner) => runner.status === "active" && !runner.photoUrl).length,
      missingShirts: state.runners.filter((runner) => runner.status === "active" && !runner.tshirtSize).length,
    };
  }, [state, todayAttendance]);

  function isCheckedIn(runnerId: string) {
    return state.attendance.some((item) => item.runnerId === runnerId && item.runId === todayRunId && item.attended);
  }

  function isVolunteerToday(runnerId: string) {
    return state.attendance.some((item) => item.runnerId === runnerId && item.runId === todayRunId && item.wasVolunteer);
  }

  async function updateAttendance(runnerId: string, updates: Partial<Attendance>) {
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

    if (SHEETS_API_URL) {
      try {
        await callSheets("checkIn", { attendance: next, adminName });
        setConnectionState("connected");
        setMessage("Saved to Google Sheets.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Saved locally, but Google Sheets did not update.");
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
    };
    setState((current) => ({ ...current, runners: [runner, ...current.runners] }));
    setSelectedRunnerId(runner.id);
    setNewRunner({ firstName: "", lastName: "", notes: "" });
    setNewRunnerOpen(false);

    if (SHEETS_API_URL) {
      try {
        await callSheets("createRunner", { runner, adminName });
        setMessage("New runner saved to Google Sheets.");
      } catch (error) {
        setConnectionState("error");
        setMessage(error instanceof Error ? error.message : "Runner added locally, but Google Sheets did not update.");
      }
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">CT</div>
          <div>
            <p className="eyebrow">CityTeam</p>
            <h1>Run Club</h1>
          </div>
        </div>

        <nav className="nav-list">
          {sections.map((item) => (
            <button
              key={item.id}
              className={section === item.id ? "nav-item active" : "nav-item"}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sync-card">
          <span className={`sync-dot ${connectionState}`} />
          <div>
            <strong>{connectionState === "connected" ? "Sheets live" : connectionState === "loading" ? "Connecting" : connectionState === "error" ? "Needs setup" : "Demo mode"}</strong>
            <p>{message}</p>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Admin check-in</p>
            <h2>{todayRun.title}</h2>
          </div>
          <label className="admin-select">
            <span>Checking in as</span>
            <select value={adminName} onChange={(event) => setAdminName(event.target.value)}>
              {state.admins.map((admin) => (
                <option key={admin}>{admin}</option>
              ))}
            </select>
          </label>
        </header>

        {section === "checkin" && (
          <div className="checkin-layout">
            <section className="run-panel">
              <div className="run-summary">
                <div>
                  <p className="eyebrow">{formatShortDate(todayRun.date)}</p>
                  <h3>{report.checkedIn} checked in</h3>
                </div>
                <div className="summary-pills">
                  <span>{report.volunteersToday} volunteers</span>
                  <span>{report.firstTimers} first-timers</span>
                </div>
              </div>

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
                {(["active", "inactive", "exited", "all"] as const).map((status) => (
                  <button
                    key={status}
                    className={statusFilter === status ? "filter active" : "filter"}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status[0].toUpperCase() + status.slice(1)}
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
                  <article key={runner.id} className={isCheckedIn(runner.id) ? "runner-row checked" : "runner-row"}>
                    <button className="runner-main" onClick={() => setSelectedRunnerId(runner.id)}>
                      <Avatar runner={runner} />
                      <span>
                        <strong>{runnerName(runner)}</strong>
                        <small>{runner.teamRole || runner.notes || "Runner"} | {countAttendance(state, runner.id)} runs | Last seen {lastSeen(state, runner.id)}</small>
                      </span>
                    </button>
                    <div className="row-actions">
                      <button
                        className={isVolunteerToday(runner.id) ? "volunteer-toggle active" : "volunteer-toggle"}
                        onClick={() => updateAttendance(runner.id, { attended: true, wasVolunteer: !isVolunteerToday(runner.id) })}
                        aria-label={`Toggle volunteer for ${runnerName(runner)}`}
                      >
                        Volunteer
                      </button>
                      <button
                        className={isCheckedIn(runner.id) ? "present-toggle active" : "present-toggle"}
                        onClick={() => updateAttendance(runner.id, { attended: !isCheckedIn(runner.id), wasVolunteer: isVolunteerToday(runner.id) && !isCheckedIn(runner.id) })}
                      >
                        {isCheckedIn(runner.id) ? "Present" : "Check In"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <ProfileCard runner={selectedRunner} state={state} />
          </div>
        )}

        {section === "people" && <PeopleSection state={state} selectRunner={(id) => { setSelectedRunnerId(id); setSection("checkin"); }} />}
        {section === "runs" && <RunsSection state={state} />}
        {section === "reports" && <ReportsSection state={state} report={report} />}
        {section === "gear" && <GearSection state={state} />}
        {section === "settings" && <SettingsSection />}
      </section>
    </main>
  );
}

function Avatar({ runner }: { runner: Runner }) {
  if (runner.photoUrl) {
    return <img className="avatar" src={runner.photoUrl} alt={`${runnerName(runner)} profile`} />;
  }
  return <span className="avatar fallback">{initials(runner)}</span>;
}

function ProfileCard({ runner, state }: { runner?: Runner; state: AppState }) {
  if (!runner) return null;
  const history = state.attendance
    .filter((item) => item.runnerId === runner.id && item.attended)
    .map((item) => state.runs.find((run) => run.id === item.runId))
    .filter(Boolean)
    .sort((a, b) => (b?.date ?? "").localeCompare(a?.date ?? ""));

  return (
    <aside className="profile-panel">
      <div className="profile-hero">
        <Avatar runner={runner} />
        <div>
          <p className="eyebrow">{runner.status}</p>
          <h3>{runnerName(runner)}</h3>
          <p>{runner.teamRole || "Runner"}</p>
        </div>
      </div>

      <div className="profile-stats">
        <span><strong>{countAttendance(state, runner.id)}</strong> Runs</span>
        <span><strong>{countVolunteered(state, runner.id)}</strong> Volunteer</span>
        <span><strong>{lastSeen(state, runner.id)}</strong> Last seen</span>
      </div>

      <section>
        <h4>Memory Notes</h4>
        <p>{runner.notes || "No notes yet."}</p>
        {runner.attendanceUpdates && <p className="muted">{runner.attendanceUpdates}</p>}
      </section>

      <section>
        <h4>Gear</h4>
        <div className="gear-grid">
          <span>Shoe {runner.shoeSize || "?"}</span>
          <span>{runner.demoShoes ? "Demo shoes" : "No demo shoes"}</span>
          <span>Shirt {runner.tshirtSize || "?"}</span>
          <span>{runner.shirtReceivedDate ? `Received ${formatShortDate(runner.shirtReceivedDate)}` : "Shirt pending"}</span>
        </div>
      </section>

      <section>
        <h4>Recent Runs</h4>
        <div className="timeline">
          {history.slice(0, 6).map((run) => (
            <span key={run?.id}>{run ? formatShortDate(run.date) : ""}</span>
          ))}
        </div>
      </section>
    </aside>
  );
}

function PeopleSection({ state, selectRunner }: { state: AppState; selectRunner: (id: string) => void }) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Photo directory</p>
          <h3>People</h3>
        </div>
        <span>{state.runners.length} profiles</span>
      </div>
      <div className="people-grid">
        {state.runners.map((runner) => (
          <button key={runner.id} className="person-card" onClick={() => selectRunner(runner.id)}>
            <Avatar runner={runner} />
            <strong>{runnerName(runner)}</strong>
            <small>{runner.status} | {countAttendance(state, runner.id)} runs</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function RunsSection({ state }: { state: AppState }) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Attendance history</p>
          <h3>Runs</h3>
        </div>
      </div>
      <div className="table-list">
        {state.runs
          .slice()
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((run) => {
            const records = state.attendance.filter((item) => item.runId === run.id && item.attended);
            return (
              <article key={run.id} className="table-row">
                <span>
                  <strong>{run.title}</strong>
                  <small>{formatShortDate(run.date)}</small>
                </span>
                <span>{records.length} runners</span>
                <span>{records.filter((item) => item.wasVolunteer).length} volunteers</span>
              </article>
            );
          })}
      </div>
    </section>
  );
}

function ReportsSection({ state, report }: { state: AppState; report: ReturnType<typeof buildReportShape> }) {
  const runs = state.runs.slice().sort((a, b) => a.date.localeCompare(b.date));
  const max = Math.max(
    1,
    ...runs.map((run) => state.attendance.filter((item) => item.runId === run.id && item.attended).length),
  );

  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CityTeam trends</p>
          <h3>Reports</h3>
        </div>
      </div>
      <div className="metric-grid">
        <Metric label="Last Run" value={`${report.checkedIn}`} detail={`${report.volunteersToday} volunteers`} />
        <Metric label="Active Runners" value={`${report.activeCount}`} detail={`${report.missingPhotos} need photos`} />
        <Metric label="This Month" value={`${report.uniqueThisMonth}`} detail="unique runners" />
        <Metric label="Follow Up" value={`${report.notSeen60}`} detail="not seen in 60 days" />
      </div>

      <div className="chart-panel">
        <h4>Attendance Over Time</h4>
        <div className="bar-chart">
          {runs.map((run) => {
            const count = state.attendance.filter((item) => item.runId === run.id && item.attended).length;
            return (
              <div className="bar-column" key={run.id}>
                <span style={{ height: `${Math.max(10, (count / max) * 100)}%` }} />
                <small>{formatShortDate(run.date)}</small>
              </div>
            );
          })}
        </div>
      </div>

      <div className="two-column">
        <FollowUpList state={state} />
        <GearSnapshot state={state} />
      </div>
    </section>
  );
}

function buildReportShape() {
  return {
    activeCount: 0,
    checkedIn: 0,
    volunteersToday: 0,
    uniqueThisMonth: 0,
    firstTimers: 0,
    notSeen60: 0,
    missingPhotos: 0,
    missingShirts: 0,
  };
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="metric-card">
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

function FollowUpList({ state }: { state: AppState }) {
  const rows = state.runners
    .filter((runner) => runner.status === "active")
    .map((runner) => ({ runner, seen: lastSeen(state, runner.id), count: countAttendance(state, runner.id) }))
    .sort((a, b) => a.count - b.count)
    .slice(0, 5);

  return (
    <section className="mini-panel">
      <h4>Follow-Up List</h4>
      {rows.map(({ runner, seen }) => (
        <div className="mini-row" key={runner.id}>
          <span>{runnerName(runner)}</span>
          <small>{seen}</small>
        </div>
      ))}
    </section>
  );
}

function GearSnapshot({ state }: { state: AppState }) {
  const sizes = state.runners.reduce<Record<string, number>>((acc, runner) => {
    const size = runner.tshirtSize || "Missing";
    acc[size] = (acc[size] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="mini-panel">
      <h4>Shirt Sizes</h4>
      {Object.entries(sizes).map(([size, count]) => (
        <div className="mini-row" key={size}>
          <span>{size}</span>
          <small>{count}</small>
        </div>
      ))}
    </section>
  );
}

function GearSection({ state }: { state: AppState }) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sizes and supplies</p>
          <h3>Gear</h3>
        </div>
      </div>
      <div className="table-list">
        {state.runners.map((runner) => (
          <article key={runner.id} className="table-row gear-row">
            <span>
              <strong>{runnerName(runner)}</strong>
              <small>{runner.status}</small>
            </span>
            <span>Shoe {runner.shoeSize || "?"}</span>
            <span>Shirt {runner.tshirtSize || "?"}</span>
            <span>{runner.demoShoes ? "Demo shoes" : "No demo"}</span>
          </article>
        ))}
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
          <h3>Google Sheets Backend</h3>
        </div>
      </div>
      <div className="setup-panel">
        <p>
          This app is ready to use with Google Sheets through a Google Apps Script web app.
          Add the deployed script URL as <code>NEXT_PUBLIC_SHEETS_API_URL</code> and the shared
          secret as <code>NEXT_PUBLIC_SHEETS_API_KEY</code>.
        </p>
        <p>
          Until those values are configured, the app runs in demo mode so the check-in flow,
          profiles, reports, and gear views can be reviewed safely.
        </p>
      </div>
    </section>
  );
}
