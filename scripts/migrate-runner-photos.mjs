import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { photoBucket, photoConfig, storePhoto } from "../lib/runner-photos.ts";

// The CLI supplies credentials in memory; never write or log API keys or photos.
const project = process.env.SUPABASE_PROJECT_REF;
if (!project) throw new Error("Set SUPABASE_PROJECT_REF to the existing project.");
const keys = JSON.parse(execFileSync("supabase", ["projects", "api-keys", "--project-ref", project, "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${project}.supabase.co`;
process.env.SUPABASE_SERVICE_ROLE_KEY = keys.find((key) => key.name === "service_role")?.api_key;
const { url, headers } = photoConfig();
async function api(path, init = {}) {
  const response = await fetch(`${url}${path}`, { ...init, headers: { ...headers, "Content-Type": "application/json", ...init.headers } });
  if (!response.ok) throw new Error(`Migration request failed (${response.status}).`);
  return response;
}
const rows = await (await api("/rest/v1/runners?select=id,photo_url&order=id.asc")).json();
let migrated = 0;
let originalBytes = 0;
let thumbnailBytes = 0;
for (const row of rows) {
  if (!row.photo_url?.startsWith("data:image/")) continue;
  const match = row.photo_url.match(/^data:image\/[\w.+-]+;base64,([\s\S]+)$/);
  if (!match) throw new Error("Unsupported legacy photo encoding; original unchanged.");
  const bytes = Buffer.from(match[1], "base64");
  const photo = await storePhoto(bytes);
  // Verify both objects before replacing the database field. Originals are exact copies.
  const saved = Buffer.from(await (await api(`/storage/v1/object/authenticated/${photoBucket}/${photo.id}/original`)).arrayBuffer());
  if (createHash("sha256").update(saved).digest("hex") !== photo.id) throw new Error("Original verification failed; database unchanged.");
  const thumb = Buffer.from(await (await api(`/storage/v1/object/authenticated/${photoBucket}/${photo.id}/thumb`)).arrayBuffer());
  if (!thumb.equals(photo.thumbnail)) throw new Error("Thumbnail verification failed; database unchanged.");
  const updated = await (await api("/rest/v1/rpc/migrate_runner_photo", {
    method: "POST", body: JSON.stringify({ p_id: row.id, p_previous: row.photo_url, p_url: photo.photoUrl }),
  })).json();
  if (updated) {
    migrated++;
    originalBytes += bytes.length;
    thumbnailBytes += thumb.length;
    console.log(JSON.stringify({ migrated, originalBytes, thumbnailBytes }));
  }
}
const start = performance.now();
const response = await api("/rest/v1/runners?select=*&order=status.asc,first_name.asc,last_name.asc");
const body = await response.text();
console.log(JSON.stringify({ complete: true, migrated, rosterBytes: Buffer.byteLength(body), rosterMs: Math.round(performance.now() - start), remainingEmbeddedPhotos: JSON.parse(body).filter((row) => row.photo_url?.startsWith("data:")).length }));
