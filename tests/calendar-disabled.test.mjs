import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { googleCalendarSyncEnabled } from '../lib/calendar-sync.ts';

const require = createRequire(import.meta.url);
const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const noFetch = () => { throw new Error('Calendar network access must be disabled'); };

test('server blocks all calendar actions even with credentials and stale clients', async () => {
  assert.equal(googleCalendarSyncEnabled, false);
  const exports = {};
  vm.runInNewContext(ts.transpile(read('../app/api/google-calendar/upcoming-run/route.ts'), {module:ts.ModuleKind.CommonJS}), {
    exports, fetch:noFetch, process:{env:{GOOGLE_SERVICE_ACCOUNT_EMAIL:'test',GOOGLE_PRIVATE_KEY:'test'}},
    require: name => name.endsWith('calendar-sync') ? {googleCalendarSyncEnabled} : require(name),
  });
  for (const action of ['upsert','delete','reconcile']) {
    const response = await exports.POST({json:async()=>({action})});
    const result = await response.json();
    assert.equal(result.disabled, true);
    assert.equal(result.configured, false);
    assert.deepEqual(result.missingRunIds, []);
  }
});

test('browser helpers perform no calendar requests and polling is disabled', async () => {
  const source = read('../app/page.tsx');
  const functions = source.slice(source.indexOf('async function syncUpcomingRunCalendar('), source.indexOf('async function insertRunner('));
  const context = vm.createContext({googleCalendarSyncEnabled,fetch:noFetch});
  vm.runInContext(ts.transpile(functions), context);
  assert.equal((await context.syncUpcomingRunCalendar('upsert', {})).configured, false);
  assert.equal((await context.syncUpcomingRunCalendar('delete', {})).configured, false);
  assert.equal((await context.reconcileUpcomingRunsCalendar([])).configured, false);
  assert.equal(source.split('if (!googleCalendarSyncEnabled || viewOnly || section !== "upcoming"').length - 1, 2);
});
