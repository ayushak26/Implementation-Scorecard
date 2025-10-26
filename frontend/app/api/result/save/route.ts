import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE = path.join(process.cwd(), "data", "latest_scorecard.json");

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, body, "utf8");
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}