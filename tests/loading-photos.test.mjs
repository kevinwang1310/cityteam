import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
import ts from "typescript";
import sharp from "sharp";
import { preparePhoto, storePhoto } from "../lib/runner-photos.ts";

test("photos retain their exact original and get a small thumbnail", async () => {
  const original = await sharp({ create: { width: 1600, height: 2400, channels: 3, background: "#249678" } }).jpeg().toBuffer();
  const photo = await preparePhoto(original);
  assert.equal(photo.id, createHash("sha256").update(original).digest("hex"));
  const metadata = await sharp(photo.thumbnail).metadata();
  assert.equal(metadata.width, 320);
  assert.equal(metadata.height, 320);
  assert.equal(metadata.format, "webp");
  assert.ok(photo.thumbnail.length < original.length);
  await assert.rejects(preparePhoto(Buffer.from("not a photo")));
});

test("storage writes both original and thumbnail and propagates failures", async (t) => {
  const original = await sharp({ create: { width: 64, height: 64, channels: 3, background: "white" } }).png().toBuffer();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://storage.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
  const writes = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    writes.push({ url, init });
    return new Response("{}", { status: 200 });
  });
  const saved = await storePhoto(original);
  assert.equal(writes.length, 2);
  assert.ok(Buffer.from(writes[0].init.body).equals(original));
  assert.ok(writes[1].url.endsWith("/thumb"));
  assert.match(saved.photoUrl, /^\/api\/photos\/[a-f0-9]{64}$/);
  globalThis.fetch.mock.mockImplementation(async () => new Response(null, { status: 500 }));
  await assert.rejects(storePhoto(original));
});

test("Check In loads without waiting for race results or upcoming details", async () => {
  const source = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const code = source.slice(source.indexOf("async function loadSupabaseState("), source.indexOf("async function uploadRunnerPhoto("));
  const tables = [];
  const context = vm.createContext({
    supabaseRequest: async (path) => { tables.push(path.split("?")[0]); return []; },
    loadRaceResults: async () => { throw new Error("Race endpoint unavailable"); },
    fromRunnerRow: x => x, fromRunRow: x => x, fromAttendanceRow: x => x,
    fromUpcomingRunRow: x => x, fromUpcomingRunVolunteerRow: x => x,
    configuredAdmins: ["Admin"],
  });
  vm.runInContext(ts.transpile(code), context);
  const core = await context.loadSupabaseState();
  assert.deepEqual(tables.sort(), ["admins", "attendance", "runners", "runs"]);
  assert.equal(core.detailsLoading, true);
  assert.equal(core.raceResults.length, 0);
  await assert.rejects(context.loadSecondaryState());
});
