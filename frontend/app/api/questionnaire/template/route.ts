// app/api/questionnaire/template/route.ts
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FASTAPI_BASE = process.env.NEXT_PUBLIC_FASTAPI_BASE || "http://backend:8000";
const CACHE_FILE = path.join(process.cwd(), "data", "latest_questionnaire.json");

type Question = {
  id: string;
  sdg_number: number;
  sdg_description: string;
  sdg_target: string;
  sustainability_dimension: string;
  kpi: string;
  question: string;
  sector: string;
};

const DEFAULT_SDGS = Array.from({ length: 17 }, (_, i) => i + 1);
const DEFAULT_DIMENSIONS = [
  "Economic Performance",
  "Circular Performance",
  "Environmental Performance",
  "Social Performance",
];

function buildTemplateQuestions(
  sdgs: number[] = DEFAULT_SDGS,
  dims: string[] = DEFAULT_DIMENSIONS,
  sector = "General"
): Question[] {
  const out: Question[] = [];
  for (const sdg of sdgs) {
    for (const d of dims) {
      out.push({
        id: `sdg${sdg}-${d.replace(/\s+/g, "_").toLowerCase()}`,
        sdg_number: sdg,
        sdg_description: `SDG ${sdg}`,
        sdg_target: "",
        sustainability_dimension: d,
        kpi: "",
        question: `Rate ${d} for SDG ${sdg}`,
        sector,
      });
    }
  }
  return out;
}

async function readCachedQuestions(): Promise<{ questions: Question[]; sector: string } | null> {
  try {
    const buf = await fs.readFile(CACHE_FILE, "utf8");
    const json = JSON.parse(buf);
    if (Array.isArray(json?.questions) && json.questions.length > 0) {
      return { questions: json.questions, sector: json.sector || "General" };
    }
  } catch {}
  return null;
}

export async function GET(_req: NextRequest) {
  try {
    // 1) Serve cached questions if available
    const cached = await readCachedQuestions();
    if (cached) {
      return NextResponse.json(
        { success: true, questions: cached.questions, sector: cached.sector },
        { status: 200 }
      );
    }

    // 2) Fetch meta from FastAPI and synthesize questions
    const upstream = await fetch(`${FASTAPI_BASE}/api/questionnaire/template`, {
      method: "GET",
      headers: { "Cache-Control": "no-store" },
      // @ts-ignore
      cache: "no-store",
      next: { revalidate: 0 },
    });

    const text = await upstream.text();
    let raw: any = {};
    try { raw = text ? JSON.parse(text) : {}; } catch { raw = {}; }

    if (!upstream.ok && (raw?.error || raw?.detail)) {
      return NextResponse.json(
        { success: false, error: raw.error || raw.detail },
        { status: upstream.status }
      );
    }

    const sdgs = Array.isArray(raw?.sdgs) ? raw.sdgs : DEFAULT_SDGS;
    const dims = Array.isArray(raw?.dimensions) ? raw.dimensions : DEFAULT_DIMENSIONS;
    const sector = typeof raw?.sector === "string" && raw.sector.trim() ? raw.sector : "General";

    return NextResponse.json(
      {
        success: true,
        questions: buildTemplateQuestions(sdgs, dims, sector),
        sector,
        meta: { sdgs, dimensions: dims, score_rubric: raw?.score_rubric || {} },
      },
      { status: 200 }
    );
  } catch (e: any) {
    // 3) Hard fallback (never break UI)
    return NextResponse.json(
      {
        success: true,
        questions: buildTemplateQuestions(),
        sector: "General",
        info: "Upstream unreachable; provided default synthesized questionnaire.",
        warning: e?.message || "fetch error",
      },
      { status: 200 }
    );
  }
}
