import { NextRequest, NextResponse } from "next/server";
import { storePhoto } from "../../../lib/runner-photos";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const bytes = Buffer.from(await request.arrayBuffer());
    if (!bytes.length || bytes.length > 4_000_000) {
      return NextResponse.json({ error: "Choose a photo smaller than 4 MB." }, { status: 400 });
    }
    const { photoUrl } = await storePhoto(bytes);
    return NextResponse.json({ photoUrl });
  } catch {
    return NextResponse.json({ error: "Could not save photo. Please try again." }, { status: 500 });
  }
}
