import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);
const sourceTruthAttendanceTotals = {
  "May-2": { clients: 9, volunteers: 8, total: 17 },
  "May-9": { clients: 6, volunteers: 8, total: 14 },
  "May-16": { clients: 6, volunteers: 5, total: 11 },
  "May-23": { clients: 6, volunteers: 6, total: 12 },
  "Jun-6": { clients: 5, volunteers: 4, total: 9 },
  "Jun-20": { clients: 4, volunteers: 4, total: 8 },
  "Jul-11": { clients: 7, volunteers: 5, total: 12 },
  "Aug-1": { clients: 5, volunteers: 2, total: 7 },
  "Aug-8": { clients: 12, volunteers: 3, total: 15 },
};

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the CityTeam Run Club app", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>CityTeam Run Club<\/title>/i);
  assert.match(html, /CityTeam/);
  assert.match(html, /Run Club/);
  assert.match(html, /cityteamlogo\.svg/);
  assert.match(html, /Check In/);
  assert.match(html, /Runs/);
  assert.match(html, /Photo Album/);
  assert.match(html, /https:\/\/photos\.app\.goo\.gl\/qfBZysZRK31yaNKC6/);
  assert.doesNotMatch(html, /Reports/);
  assert.match(html, /manifest\.webmanifest/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps production app files free of starter preview wiring", async () => {
  const [page, css, layout, packageJson, manifest] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
  ]);

  assert.match(page, /CityTeam/);
  assert.match(page, /\/cityteamlogo\.svg/);
  assert.match(page, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(page, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(page, /function attendanceRoleCounts/);
  assert.match(page, /attendanceCounts\.clients\} runners/);
  assert.match(page, /attendanceCounts\.volunteers\} volunteers/);
  assert.match(page, /function chartLabelY/);
  assert.match(page, /type ChartRange = 8 \| 16 \| "all"/);
  assert.match(page, /const chartRangeOptions/);
  assert.match(page, /function chartDateLabelStep/);
  assert.match(page, /const \[chartRange, setChartRange\] = useState<ChartRange>\(8\)/);
  assert.match(page, /Attendance chart range/);
  assert.match(page, /Retention chart range/);
  assert.match(page, /Showing \{points\.length\} of \{allPoints\.length\} runs/);
  assert.match(page, /index % dateLabelStep === 0/);
  assert.match(page, /function chartLabelY\(valueY: number, peerY: number, chartBottomY: number, tieSide: "above" \| "below" = "above"\)/);
  assert.match(page, /const clientLabelY = chartLabelY\(clientY, volunteerY, height - chart\.bottom, "above"\)/);
  assert.match(page, /const volunteerLabelY = chartLabelY\(volunteerY, clientY, height - chart\.bottom, "below"\)/);
  assert.match(page, /<stop offset="0%" stopColor="#60a5fa" stopOpacity="0\.12" \/>/);
  assert.match(page, /attendance-edit-row/);
  assert.match(page, /cityteam-client/);
  assert.match(page, /volunteer/);
  assert.match(page, /function roleClassName/);
  assert.match(page, /useState<PersonType \| "all">\("cityteam_client"\)/);
  assert.match(page, /function PeopleSection[\s\S]*useState<PersonType \| "all">\("cityteam_client"\)/);
  assert.match(page, /const \[runDayDialogOpen, setRunDayDialogOpen\] = useState\(false\)/);
  assert.match(page, /state\.upcomingRuns\.find\(\(run\) => run\.date === todayDateValue\)/);
  assert.match(page, /const isScheduledRunDay = Boolean\(todayUpcomingRun\)/);
  assert.match(page, /setRunDayDialogOpen\(true\)/);
  assert.match(page, /Please check-in on run day/);
  assert.match(page, /Check-in/);
  assert.doesNotMatch(page, /No Run/);
  assert.doesNotMatch(page, /disabled=\{!isScheduledRunDay\}/);
  assert.match(page, /checkinProfileRunner \? "checkin-layout profile-open" : "checkin-layout"/);
  assert.match(page, /checkin-runner-list/);
  assert.match(page, /Run day milestone/);
  assert.match(page, /T-shirt earned on this check-in/);
  assert.match(page, /New shoes earned on this check-in/);
  assert.match(page, /New record streak/);
  assert.match(page, /runnerName\(a\)\.localeCompare\(runnerName\(b\)\)/);
  assert.doesNotMatch(page, /Number\(isCheckedIn\(b\.id\)\)/);
  assert.match(page, /function ClientRetentionTrendChart/);
  assert.match(page, /First-Time and Returning Runners/);
  assert.match(page, /chart-legend chart-legend-overlay/);
  assert.match(page, /firstTime/);
  assert.match(page, /returning/);
  assert.match(page, /Run Day Celebration/);
  assert.match(page, /const \[celebrationScope, setCelebrationScope\] = useState<"active" \| "all">\("active"\)/);
  assert.match(page, /aria-label="Celebration scope"/);
  assert.match(page, /celebrationScope === "all" \|\| normalizeRunnerStatus\(runner\.status\) === "active"/);
  assert.match(page, /const latestRunSummary = latestRun/);
  assert.match(page, /latestRun\.title\.trim\(\) === formatShortDate\(latestRun\.date\)/);
  assert.match(page, /Top 5 Streaks/);
  assert.match(page, /Shoes Earned/);
  assert.match(page, /T-Shirts Earned/);
  assert.match(page, /Comebacks/);
  assert.match(page, /function formatCalendarDate/);
  assert.match(page, /function formatMonthHeading/);
  assert.match(page, /upcomingRunGroups/);
  assert.match(page, /<div className="upcoming-run-list">[\s\S]*<div className="upcoming-run-form">/);
  assert.match(page, /upcoming-month-section/);
  assert.match(page, /upcoming-month-heading/);
  assert.match(page, /upcoming-month-runs/);
  assert.match(page, /Volunteers confirmed/);
  assert.match(page, /confirmedVolunteerIds/);
  assert.match(page, /confirmed-volunteer-avatars/);
  assert.match(page, /confirmed volunteer photos/);
  assert.doesNotMatch(page, /openVolunteerSlots/);
  assert.doesNotMatch(page, /<span>Open<\/span>/);
  assert.match(page, /calendar-date-tile/);
  assert.doesNotMatch(page, /\{calendarDate\.weekday\}/);
  assert.doesNotMatch(page, /upcoming-rsvp-progress/);
  assert.doesNotMatch(page, /upcoming-run-badge/);
  assert.doesNotMatch(page, /Next on the calendar/);
  assert.match(page, /Profile Details/);
  assert.match(page, /Attendance History/);
  assert.match(page, /Shirts/);
  assert.match(page, /profile-section-label profile-details/);
  assert.match(page, /profile-section-label shoes/);
  assert.match(page, /profile-section-label shirts/);
  assert.match(page, /profile-section-label notes/);
  assert.match(page, /profile-section-label attendance-history/);
  assert.match(page, /notes-field/);
  assert.match(page, /profile-delete-action/);
  assert.match(page, /checkin-runner-list", personTypeFilter === "all" \? "mixed-role-view"/);
  assert.match(page, /people-grid", personTypeFilter === "all" \? "mixed-role-view"/);
  assert.match(page, /attendance-editor mixed-role-view/);
  assert.doesNotMatch(page, /profile-section-kicker/);
  assert.doesNotMatch(page, /personTypeLabels\[runner\.personType\]\}<\/p>/);
  assert.match(css, /\.mixed-role-view \.attendance-edit-row\.cityteam-client/);
  assert.match(css, /\.mixed-role-view \.attendance-edit-row\.volunteer/);
  assert.match(css, /\.mixed-role-view \.runner-row\.cityteam-client/);
  assert.match(css, /\.mixed-role-view \.runner-row\.volunteer/);
  assert.match(css, /\.checkin-runner-list/);
  assert.match(css, /\.celebration-dialog/);
  assert.match(css, /\.mixed-role-view \.person-card\.cityteam-client/);
  assert.match(css, /\.mixed-role-view \.person-card\.volunteer/);
  assert.match(css, /\.mixed-role-view \.celebration-person-row\.cityteam-client/);
  assert.match(css, /\.mixed-role-view \.celebration-person-row\.volunteer/);
  assert.match(css, /\.profile-section-label\.profile-details::before/);
  assert.match(css, /\.profile-section-label\.attendance-history::before/);
  assert.match(css, /\.profile-editor \.notes-field > span:first-child/);
  assert.match(css, /\.profile-delete-action/);
  assert.match(css, /#dcfce7/);
  assert.match(css, /#dbeafe/);
  assert.match(css, /#16a34a/);
  assert.match(css, /#60a5fa/);
  assert.match(css, /\.chart-line\.volunteers\s*\{[^}]*stroke:\s*#60a5fa;[^}]*stroke-width:\s*1\.75;/s);
  assert.match(css, /\.chart-value-label\.volunteers\s*\{[^}]*fill:\s*#3b82f6;[^}]*font-size:\s*11px;[^}]*font-weight:\s*500;/s);
  assert.match(css, /\.chart-legend\s*\{[^}]*font-size:\s*1\.18rem;[^}]*font-weight:\s*900;/s);
  assert.match(css, /\.chart-legend-overlay\s*\{[^}]*position:\s*absolute;[^}]*top:\s*34px;[^}]*left:\s*50%;/s);
  assert.match(css, /\.line-chart-shell\s*\{[^}]*position:\s*relative;/s);
  assert.match(css, /\.line-chart-shell\s*\{[^}]*overflow:\s*hidden;/s);
  assert.match(css, /\.line-chart-shell svg\s*\{[^}]*min-width:\s*0;/s);
  assert.match(css, /\.chart-range-toggle/);
  assert.match(css, /\.celebration-grid/);
  assert.match(css, /\.chart-line\.first-time/);
  assert.match(css, /\.chart-line\.returning/);
  assert.doesNotMatch(css, /\.upcoming-agenda-shell/);
  assert.match(css, /\.upcoming-month-runs\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(320px, 1fr\)\)/s);
  assert.match(css, /\.upcoming-run-card\.expanded\s*\{[^}]*grid-column:\s*1 \/ -1;/s);
  assert.match(css, /\.upcoming-month-heading/);
  assert.match(css, /\.upcoming-month-heading h4\s*\{[^}]*color:\s*#1d4ed8;[^}]*font-size:\s*1\.42rem;[^}]*font-weight:\s*900;/s);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.upcoming-run-head\s*\{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\);/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.calendar-date-tile\s*\{[^}]*width:\s*62px;[^}]*grid-template-columns:\s*1fr;/);
  assert.match(css, /\.metric-card\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;/s);
  assert.match(css, /\.confirmed-volunteer-avatars \.avatar\s*\{[^}]*width:\s*52px;[^}]*height:\s*52px;/s);
  assert.match(css, /\.snack-status\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;/s);
  assert.match(css, /\.calendar-date-tile/);
  assert.match(css, /\.upcoming-run-metrics/);
  assert.doesNotMatch(css, /\.upcoming-rsvp-progress/);
  assert.doesNotMatch(page, /records\.length\} runners/);
  assert.doesNotMatch(page, /SHEETS_API|Google Sheets|Apps Script/i);
  assert.match(layout, /manifest:\s*"\/manifest\.webmanifest"/);
  assert.match(manifest, /CityTeam Run Club/);
  assert.match(css, /--navy:\s*#0b2a42/);
  const photoModalZIndex = Number(css.match(/\.photo-modal-backdrop\s*\{[^}]*z-index:\s*(\d+)/s)?.[1]);
  const mobileProfileZIndex = Number(css.match(/\.profile-panel\.mobile-profile-open\s*\{[^}]*z-index:\s*(\d+)/s)?.[1]);
  assert.ok(photoModalZIndex > mobileProfileZIndex);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page + layout + css, /codex-preview|_sites-preview|SkeletonPreview/i);

  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", templateRoot)),
  );
});

test("documents source-of-truth attendance totals from Master rows 39-41", () => {
  assert.deepEqual(sourceTruthAttendanceTotals["May-2"], { clients: 9, volunteers: 8, total: 17 });
  assert.deepEqual(sourceTruthAttendanceTotals["Aug-8"], { clients: 12, volunteers: 3, total: 15 });

  for (const [date, counts] of Object.entries(sourceTruthAttendanceTotals)) {
    assert.equal(
      counts.clients + counts.volunteers,
      counts.total,
      `${date} source-truth client and volunteer counts should sum to total`,
    );
  }
});
