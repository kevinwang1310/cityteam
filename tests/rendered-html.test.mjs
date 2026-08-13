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
  assert.match(page, /attendance-edit-row/);
  assert.match(page, /cityteam-client/);
  assert.match(page, /volunteer/);
  assert.match(page, /function roleClassName/);
  assert.match(page, /runnerName\(a\)\.localeCompare\(runnerName\(b\)\)/);
  assert.doesNotMatch(page, /Number\(isCheckedIn\(b\.id\)\)/);
  assert.match(page, /function ClientRetentionTrendChart/);
  assert.match(page, /First-Time and Returning Runners/);
  assert.match(page, /firstTime/);
  assert.match(page, /returning/);
  assert.match(page, /Run Day Celebration/);
  assert.match(page, /Top 5 Streaks/);
  assert.match(page, /Shoes Earned/);
  assert.match(page, /T-Shirts Earned/);
  assert.match(page, /Comebacks/);
  assert.match(page, /Profile Details/);
  assert.match(page, /Attendance History/);
  assert.match(page, /Shirts/);
  assert.match(page, /profile-section-label shoes/);
  assert.match(page, /profile-section-label shirts/);
  assert.match(page, /profile-section-label notes/);
  assert.doesNotMatch(page, /profile-section-kicker/);
  assert.match(css, /\.attendance-edit-row\.cityteam-client/);
  assert.match(css, /\.attendance-edit-row\.volunteer/);
  assert.match(css, /\.runner-row\.cityteam-client/);
  assert.match(css, /\.runner-row\.volunteer/);
  assert.match(css, /\.person-card\.cityteam-client/);
  assert.match(css, /\.person-card\.volunteer/);
  assert.match(css, /\.celebration-person-row\.cityteam-client/);
  assert.match(css, /\.celebration-person-row\.volunteer/);
  assert.match(css, /#dcfce7/);
  assert.match(css, /#dbeafe/);
  assert.match(css, /#16a34a/);
  assert.match(css, /#2563eb/);
  assert.match(css, /\.celebration-grid/);
  assert.match(css, /\.chart-line\.first-time/);
  assert.match(css, /\.chart-line\.returning/);
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
