import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FASTAPI_BASE = process.env.NEXT_PUBLIC_FASTAPI_BASE || "http://backend:8000";

export async function GET() {
  const resp = await fetch(`${FASTAPI_BASE}/api/questionnaire/template`);
  const payload = await resp.json().catch(() => ({}));
  return NextResponse.json(payload, { status: resp.status });
}
