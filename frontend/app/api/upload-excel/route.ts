import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In Docker, backend is reachable as http://backend:8000 (service name)
const FASTAPI_BASE = process.env.NEXT_PUBLIC_FASTAPI_BASE || "http://backend:8000";

async function forward(fd: FormData, path: string) {
  const resp = await fetch(`${FASTAPI_BASE}${path}`, { method: "POST", body: fd });
  let payload: any = {};
  try { payload = await resp.json(); } catch { /* non-JSON upstream */ }
  return { resp, payload };
}

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (!ct.startsWith("multipart/form-data")) {
    return NextResponse.json(
      { detail: 'Send as multipart form-data with field "file".' },
      { status: 415 }
    );
  }

  try {
    const inFd = await req.formData();
    const file = inFd.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ detail: "Missing file" }, { status: 400 });
    }

    const relay = new FormData();
    relay.append("file", file, (file as any).name || "upload.xlsx");

    // Try FastAPI at /api/upload-excel first, then fallback to /upload-excel
    let { resp, payload } = await forward(relay, "/api/upload-excel");
    if (resp.status === 404) {
      ({ resp, payload } = await forward(relay, "/upload-excel"));
    }

    return NextResponse.json(payload || { detail: "Upstream error" }, { status: resp.status });
  } catch (e: any) {
    console.error("Upload proxy error:", e?.message || e);
    return NextResponse.json({ detail: e?.message || "Proxy error" }, { status: 500 });
  }
}
