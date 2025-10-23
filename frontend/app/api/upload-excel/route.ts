// app/api/upload-excel/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const FASTAPI_BASE = process.env.NEXT_PUBLIC_FASTAPI_BASE || "http://backend:8000";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const resp = await fetch(`${FASTAPI_BASE}/api/upload-excel`, {
      method: "POST",
      body: formData,
    });
    const payload = await resp.json().catch(() => ({}));
    return NextResponse.json(payload, { status: resp.status });
  } catch {
    return NextResponse.json({ error: "Failed to upload Excel" }, { status: 500 });
  }
}
