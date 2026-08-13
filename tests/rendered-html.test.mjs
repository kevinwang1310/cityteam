import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

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
