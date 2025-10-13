import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FASTAPI_BASE = process.env.NEXT_PUBLIC_FASTAPI_BASE || "http://backend:8000";

// Client sends: { sector: string, rows: Partial<Row>[] }
// Backend expects: List[QuestionnaireRow] (each row should already include sector)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const sector = String(body?.sector || "").trim() || "General";
    const rowsIn = Array.isArray(body?.rows) ? body.rows : [];

    // Inject sector into each row; leave other fields as-is
    const rows = rowsIn.map((r: any) => ({ ...r, sector }));

    const resp = await fetch(`${FASTAPI_BASE}/api/questionnaire/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rows),
    });

    const payload = await resp.json().catch(() => ({}));
    return NextResponse.json(payload, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json({ success: false, detail: e?.message || "Proxy error" }, { status: 500 });
  }
}