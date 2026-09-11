import { createHash } from "node:crypto";
import sharp from "sharp";

export const photoBucket = "runner-photos";

export function photoConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Photo storage is not configured.");
  return { url: url.replace(/\/$/, ""), headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

export async function preparePhoto(bytes: Buffer) {
  const decoder = sharp(bytes, { limitInputPixels: 50_000_000 });
  const metadata = await decoder.metadata();
  if (!["jpeg", "png", "webp", "heif"].includes(metadata.format ?? "")) throw new Error("Unsupported photo format.");
  const thumbnail = await decoder.rotate().resize(320, 320, { fit: "cover", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const id = createHash("sha256").update(bytes).digest("hex");
  const contentType = metadata.format === "jpeg" ? "image/jpeg" : `image/${metadata.format}`;
  return { id, thumbnail, contentType };
}

export async function storePhoto(bytes: Buffer) {
  const { url, headers } = photoConfig();
  const prepared = await preparePhoto(bytes);
  for (const [name, data, type] of [
    ["original", bytes, prepared.contentType],
    ["thumb", prepared.thumbnail, "image/webp"],
  ] as const) {
    const response = await fetch(`${url}/storage/v1/object/${photoBucket}/${prepared.id}/${name}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": type, "x-upsert": "true", "Cache-Control": "31536000" },
      body: new Uint8Array(data),
    });
    if (!response.ok) throw new Error(`Could not store photo (${response.status}).`);
  }
  return { ...prepared, photoUrl: `/api/photos/${prepared.id}` };
}
