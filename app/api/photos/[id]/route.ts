import { NextRequest } from "next/server";
import { photoBucket, photoConfig } from "../../../../lib/runner-photos";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{64}$/.test(id)) return new Response(null, { status: 404 });
  try {
    const { url, headers } = photoConfig();
    const size = request.nextUrl.searchParams.get("size") === "thumb" ? "thumb" : "original";
    const response = await fetch(`${url}/storage/v1/object/authenticated/${photoBucket}/${id}/${size}`, { headers });
    if (!response.ok) return new Response(null, { status: response.status === 404 ? 404 : 502 });
    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
