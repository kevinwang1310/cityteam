import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { NextRequest } from "next/server.js";
import * as access from "../lib/site-access.ts";

const require = createRequire(import.meta.url);
function load(path, overrides = {}) {
  const source = fs.readFileSync(new URL(path, import.meta.url), "utf8");
  const exports = {};
  vm.runInNewContext(ts.transpile(source, { module: ts.ModuleKind.CommonJS }), {
    exports, process, Buffer, URL, Response, fetch: (...args) => fetch(...args),
    require: (name) => name.endsWith("site-access") ? access : require(name),
    ...overrides,
  });
  return exports;
}

function request(path, method = "GET", role, body) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: role ? { cookie: `${access.accessCookieName}=${access.accessToken(role)}` } : {},
    body,
  });
}

test("viewer token cannot be used as administrator or legacy access", () => {
  assert.equal(access.accessRole(access.accessToken("viewer")), "viewer");
  assert.equal(access.accessRole(access.accessToken("admin")), "admin");
  assert.equal(access.accessRole("cityteam-run-club-access-v1"), null);
  assert.equal(access.accessRole("a".repeat(64)), null);
  assert.equal(access.accessRole(undefined), null);
});

test("password login selects viewer and preserves administrator access", async () => {
  const { POST } = load("../app/api/site-login/route.ts");
  for (const [password, role] of [["runners", "viewer"], ["guestrunner", "viewer"], [access.adminPassword(), "admin"]]) {
    const response = await POST(request("/api/site-login", "POST", undefined, new URLSearchParams({ password })));
    assert.equal(response.status, 303);
    assert.equal(access.accessRole(response.cookies.get(access.accessCookieName)?.value), role);
    assert.equal(response.cookies.get(access.accessCookieName)?.httpOnly, true);
  }
  const bad = await POST(request("/api/site-login", "POST", undefined, new URLSearchParams({ password: "wrong" })));
  assert.equal(bad.cookies.get(access.accessCookieName), undefined);
  assert.match(bad.headers.get("location"), /error=1/);
  const redirect = await POST(request("/api/site-login", "POST", undefined, new URLSearchParams({ password: "runners", next: "/\\outside.test" })));
  assert.equal(redirect.headers.get("location"), "http://localhost:3000/");
});

test("viewer may read but cannot write through any app API", () => {
  const { proxy } = load("../proxy.ts");
  for (const path of ["/api/data/runners", "/api/data/attendance", "/api/race-results", "/api/photos", "/api/google-calendar/upcoming-run"]) {
    for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
      assert.equal(proxy(request(path, method, "viewer")).status, 403);
      assert.equal(proxy(request(path, method, "admin")).status, 200);
      assert.equal(proxy(request(path, method)).status, 401);
    }
  }
  assert.equal(proxy(request("/", "GET", "viewer")).status, 200);
  assert.equal(proxy(request("/api/race-results", "GET", "viewer")).status, 200);
  assert.equal(proxy(request("/")).status, 307);
});

test("database writer independently rejects viewers and scopes administrator writes", async (t) => {
  const routes = load("../app/api/data/[table]/route.ts", {
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://database.test", SUPABASE_SERVICE_ROLE_KEY: "server-only-test-key" } },
  });
  const calls = [];
  t.mock.method(globalThis, "fetch", async (...args) => {
    calls.push(args);
    return new Response(null, { status: 204 });
  });
  const params = { params: Promise.resolve({ table: "runners" }) };
  for (const method of ["POST", "PATCH", "DELETE"]) {
    assert.equal((await routes[method](request("/api/data/runners", method, "viewer"), params)).status, 403);
  }
  assert.equal(calls.length, 0);
  assert.equal((await routes.PATCH(request("/api/data/runners?id=eq.test", "PATCH", "admin", "{}"), params)).status, 204);
  assert.equal(calls[0][0], "https://database.test/rest/v1/runners?id=eq.test");
  assert.equal(calls[0][1].headers.Authorization, "Bearer server-only-test-key");
  assert.equal((await routes.POST(request("/api/data/rpc", "POST", "admin"), { params: Promise.resolve({ table: "rpc" }) })).status, 404);
});
