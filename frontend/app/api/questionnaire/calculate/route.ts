// app/api/questionnaire/calculate/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const FASTAPI_BASE = process.env.NEXT_PUBLIC_FASTAPI_BASE || "http://backend:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resp = await fetch(`${FASTAPI_BASE}/api/questionnaire/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await resp.json().catch(() => ({}));
    return NextResponse.json(payload, { status: resp.status });
  } catch {
    return NextResponse.json({ error: "Failed to calculate scorecard" }, { status: 500 });
  }
}
