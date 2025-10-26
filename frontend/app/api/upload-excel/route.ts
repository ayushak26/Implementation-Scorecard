// app/api/upload-excel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FASTAPI_BASE = process.env.NEXT_PUBLIC_FASTAPI_BASE || "http://backend:8000";
const CACHE_DIR = path.join(process.cwd(), "data");
const CACHE_FILE = path.join(CACHE_DIR, "latest_questionnaire.json");

export async function POST(req: NextRequest) {
  try {
    // Accept either "file" or "excel_file"
    const form = await req.formData();
    let file = form.get("file") as File | null;
    const alt = form.get("excel_file") as File | null;
    if (!file && alt) file = alt;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No Excel file provided under 'file' or 'excel_file'." },
        { status: 400 }
      );
    }

    // Forward as multipart to FastAPI
    const upstreamForm = new FormData();
    upstreamForm.append("file", file, file.name);

    const upstream = await fetch(`${FASTAPI_BASE}/api/upload-excel`, {
      method: "POST",
      body: upstreamForm,
      // Let fetch set multipart boundary; don't set Content-Type manually
    });

    const text = await upstream.text();
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }

    if (!upstream.ok || json?.success === false) {
      return NextResponse.json(
        { success: false, error: json?.detail || json?.error || "Upload failed" },
        { status: upstream.status || 500 }
      );
    }

    // Cache questions so /api/questionnaire/template can serve them
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(
        CACHE_FILE,
        JSON.stringify({ questions: json.questions || [], sector: json.sector || "General" }, null, 2),
        "utf8"
      );
    } catch (e) {
      // Non-fatal; if caching fails we still return success
      console.warn("Failed to cache latest questionnaire:", (e as Error).message);
    }

    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "Upload error" },
      { status: 500 }
    );
  }
}
