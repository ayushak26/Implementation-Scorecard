import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE = path.join(process.cwd(), "data", "latest_scorecard.json");

export async function GET(_req: NextRequest) {
  try {
    const txt = await fs.readFile(FILE, "utf8");
    return new NextResponse(txt, { status: 200, headers: { "Content-Type": "application/json" } });
  } catch {
    return NextResponse.json({ success: false, error: "No saved result" }, { status: 404 });
  }
}
