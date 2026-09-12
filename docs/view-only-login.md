# View-only login

Enter `runners` or `guestrunner` on the existing login screen for view-only access. The existing
administrator password still enables editing. Use **Switch login** to change roles.
Existing sessions must log in again after deployment because session tokens have
changed. Session cookies are HTTP-only and never contain the password.

Viewer access includes search, filters, profiles, attendance, race results,
celebrations, and upcoming-run details. All modifying app API requests are denied.
Calendar reconciliation runs only in administrator sessions because it can update
or delete records. Viewers see the latest saved calendar data.

## Production rollout

1. Verify the existing Vercel project has `SUPABASE_SERVICE_ROLE_KEY` configured
   for Production. Never use a `NEXT_PUBLIC_` prefix for this key.
2. Deploy this app revision to the existing Vercel project.
3. Apply `supabase/migrations/20260912090000_view_only_access.sql` with
   `supabase db push` against the linked CityTeam project. Do not apply it before
   deployment: older clients save directly to Supabase and will lose write access.
4. Verify administrator saving, viewer browsing, and denied viewer API writes.
   Also verify direct Supabase writes with the public key return permission denied.
5. Ask administrators with an old tab open to reload and log in again.

Do not share the viewer password until step 3 is complete. UI restrictions alone
do not prevent direct writes using the browser's public Supabase key.

The migration revokes browser-role writes while preserving existing read access
and granting server-only writes. This follows Supabase's
[API permission guidance](https://supabase.com/docs/guides/api/securing-your-api).
Future writable tables must follow the same pattern and be explicitly allowed
in the administrator data route.

If reverting the deployment, keep the permission restrictions and port the
protected save route to the rollback version; do not restore public writes.

## Verification

`node --experimental-strip-types --test tests/view-only.test.mjs tests/loading-photos.test.mjs`

`npm run build`
