"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

// ---------------- Types ----------------
export type QuestionnaireRow = {
  sdg_number?: number | null;
  sdg_description?: string | null;
  sector?: string | null;
  sdg_target?: string | null;
  sustainability_dimension?: string | null;
  kpi?: string | null;
  question?: string | null;
  score?: number | null;
  score_description?: string | null;
  source?: string | null;
  notes?: string | null;
  status?: string | null;
  comment?: string | null;
};

// ---------------- Constants ----------------
const SDG_IMAGE_MAP: Record<number, string> = {
  1: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-01.png?resize=148%2C148&ssl=1",
  2: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-02.png?resize=148%2C148&ssl=1",
  3: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-03.png?resize=148%2C148&ssl=1",
  4: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-04.png?resize=148%2C148&ssl=1",
  5: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-05.png?resize=148%2C148&ssl=1",
  6: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-06.png?resize=148%2C148&ssl=1",
  7: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-07.png?resize=148%2C148&ssl=1",
  8: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-08.png?resize=148%2C148&ssl=1",
  9: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-09.png?resize=148%2C148&ssl=1",
  10: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-10.png?resize=148%2C148&ssl=1",
  11: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-11.png?resize=148%2C148&ssl=1",
  12: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-12.png?resize=148%2C148&ssl=1",
  13: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-13.png?resize=148%2C148&ssl=1",
  14: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-14.png?resize=148%2C148&ssl=1",
  15: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-15.png?resize=148%2C148&ssl=1",
  16: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-16.png?resize=148%2C148&ssl=1",
  17: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-17.png?resize=148%2C148&ssl=1",
};

const DIMENSIONS = [
  { key: "Economic Performance", color: "#FFB800", shortKey: "Economic" },
  { key: "Circular Performance", color: "#9B59B6", shortKey: "Circular" },
  { key: "Environmental Performance", color: "#27AE60", shortKey: "Environmental" },
  { key: "Social Performance", color: "#3498DB", shortKey: "Social" },
] as const;

// ---------------- Helpers ----------------
function canonicalSector(s?: string | null) {
  if (!s) return null;
  const t = s.toLowerCase();
  if (t.includes("textile")) return "Textiles";
  if (t.includes("fertil")) return "Fertilizers";
  if (t.includes("pack")) return "Packaging";
  return s;
}
function canonicalDim(s?: string | null): (typeof DIMENSIONS)[number]["key"] | null {
  if (!s) return null;
  const t = s.toLowerCase();
  if (t.startsWith("econ")) return "Economic Performance";
  if (t.startsWith("circ")) return "Circular Performance";
  if (t.startsWith("env")) return "Environmental Performance";
  if (t.startsWith("soc")) return "Social Performance";
  const m = DIMENSIONS.find((d) => d.key.toLowerCase() === t);
  return m ? m.key : null;
}

type Cell = {
  sdg: number;
  dim: (typeof DIMENSIONS)[number]["key"];
  score: number;
  count: number;
  items: QuestionnaireRow[];
};

function makeCells(rows: QuestionnaireRow[], sector: string): Cell[] {
  const keep = rows.filter((r) => canonicalSector(r.sector) === sector);
  const bucket = new Map<string, { sum: number; n: number; items: QuestionnaireRow[] }>();
  for (const r of keep) {
    const sdg = Number(r.sdg_number ?? 0);
    const dim = canonicalDim(r.sustainability_dimension);
    if (!sdg || !dim) continue;
    const k = `${sdg}|${dim}`;
    if (!bucket.has(k)) bucket.set(k, { sum: 0, n: 0, items: [] });
    const b = bucket.get(k)!;
    const s = r.score == null ? null : Number(r.score);
    if (Number.isFinite(s)) {
      b.sum += s!;
      b.n += 1;
    }
    b.items.push(r);
  }
  const out: Cell[] = [];
  for (let sdg = 1; sdg <= 17; sdg++) {
    for (const d of DIMENSIONS) {
      const k = `${sdg}|${d.key}`;
      const b = bucket.get(k);
      const avgScore = b && b.n ? b.sum / b.n : 0;
      out.push({
        sdg,
        dim: d.key,
        score: Math.round(avgScore),
        count: b ? b.n : 0,
        items: b ? b.items : [],
      });
    }
  }
  return out;
}

// -------------- Responsive Grid-based Roulette Visualization --------------
function useGridRoulette({
  cells,
  width,
  height,
}: {
  cells: Cell[];
  width: number;
  height: number;
}) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!width || !height) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const W = width;
    const H = height;
    const margin = Math.max(110, Math.min(W, H) * 0.12);
    const outerRadius = Math.min(W, H) / 2 - margin;
    const innerRadius = 120;

    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${W / 2},${H / 2})`);

    const angleScale = d3
      .scaleBand<number>()
      .domain(d3.range(1, 18))
      .range([0, 2 * Math.PI])
      .paddingInner(0.01);

    const scoreRadiusWidth = (outerRadius - innerRadius) / 5;
    const polar = (r: number, a: number) => ({
      x: Math.cos(a - Math.PI / 2) * r,
      y: Math.sin(a - Math.PI / 2) * r,
    });
    const deg2rad = (d: number) => (Math.PI / 180) * d;

    // --- Draw segments ---
    for (let sdg = 1; sdg <= 17; sdg++) {
      const startAngle = angleScale(sdg)!;
      const endAngle = startAngle + angleScale.bandwidth();
      const segmentAngle = angleScale.bandwidth();
      const dimensionAngleWidth = segmentAngle / 4;

      DIMENSIONS.forEach((dim, dimIndex) => {
        const dimStartAngle = startAngle + dimIndex * dimensionAngleWidth;
        const dimEndAngle = dimStartAngle + dimensionAngleWidth;

        const cellData = cells.find((c) => c.sdg === sdg && c.dim === dim.key);
        const score = cellData ? cellData.score : 0;

        for (let level = 1; level <= 5; level++) {
          const levelInnerRadius = innerRadius + (level - 1) * scoreRadiusWidth;
          const levelOuterRadius = levelInnerRadius + scoreRadiusWidth;

          const arc = d3
            .arc()
            .innerRadius(levelInnerRadius)
            .outerRadius(levelOuterRadius)
            .startAngle(dimStartAngle)
            .endAngle(dimEndAngle);

          g.append("path")
            .attr("d", arc as any)
            .attr("fill", level <= score ? dim.color : "#f3f4f6")
            .attr("opacity", level <= score ? 0.85 : 0.3)
            .attr("stroke", "#000")
            .attr("stroke-width", 0.35);
        }

        if (dimIndex > 0) {
          const p1 = polar(innerRadius, dimStartAngle);
          const p2 = polar(outerRadius, dimStartAngle);
          g.append("line")
            .attr("x1", p1.x)
            .attr("y1", p1.y)
            .attr("x2", p2.x)
            .attr("y2", p2.y)
            .attr("stroke", "#000")
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.3);
        }
      });

      // --- Bold SDG separator line ---
      const p1 = polar(innerRadius, startAngle);
      const p2 = polar(outerRadius, startAngle);
      g.append("line")
        .attr("x1", p1.x)
        .attr("y1", p1.y)
        .attr("x2", p2.x)
        .attr("y2", p2.y)
        .attr("stroke", "#000")
        .attr("stroke-width", 1.8)
        .attr("opacity", 0.9);

      // --- SDG icon (shifted +6°) ---
      const midAngle = (startAngle + endAngle) / 2;
      const iconAngle = midAngle + deg2rad(0);
      const iconRadius = outerRadius + 64;
      const icon = polar(iconRadius+25, iconAngle);
      g.append("image")
        .attr("href", SDG_IMAGE_MAP[sdg])
        .attr("x", icon.x - 15)
        .attr("y", icon.y - 40)
        .attr("width", 60)
        .attr("height", 70)
        .attr("preserveAspectRatio", "xMidYMid meet");

      // --- Dimension indices 1..4 (a bit further than the outer ring) ---
      {
        const dotR = 10;
        const gap = Math.max(6, outerRadius * 0.02);
        const dimLabelRadius = outerRadius + dotR + gap;
        for (let i = 0; i < 4; i++) {
          const dmeta = DIMENSIONS[i];
          const dimCenterAngle =
            startAngle + i * (segmentAngle / 4) + segmentAngle / 8;
          const p = polar(dimLabelRadius, dimCenterAngle);

          g.append("circle")
            .attr("cx", p.x)
            .attr("cy", p.y)
            .attr("r", dotR)
            .attr("fill", dmeta.color)
            .attr("stroke", dmeta.color)
            .attr("stroke-width", 0.6)
            .attr("opacity", 0.95);

          g.append("text")
            .attr("x", p.x)
            .attr("y", p.y + 0.5)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", 12)
            .attr("font-weight", 700)
            .attr("fill", "#fff")
            .text(String(i + 1));
        }
      }
    }

    // --- Concentric rings ---
    for (let level = 0; level <= 5; level++) {
      const radius = innerRadius + level * scoreRadiusWidth;
      g.append("circle")
        .attr("r", radius)
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", level === 0 || level === 5 ? 2 : 1)
        .attr("opacity", level === 0 || level === 5 ? 0.8 : 0.4);
    }

    // --- Score labels (shifted +6° & nudged outward) ---
    {
      const labelOffsetOutward = scoreRadiusWidth * 0.35;
      const rightShift = deg2rad(6);
      for (let sdg = 1; sdg <= 17; sdg++) {
        const startAngle = angleScale(sdg)!;
        const labelAngle = startAngle + rightShift;
        const deg = (labelAngle * 180) / Math.PI;

        const labelGroup = g.append("g").attr("transform", `rotate(${deg})`);
        for (let scoreLabel = 1; scoreLabel <= 5; scoreLabel++) {
          const ringInnerRadius = innerRadius + (scoreLabel - 1) * scoreRadiusWidth;
          const ringOuterRadius = ringInnerRadius + scoreRadiusWidth;
          const ringCenterRadius = (ringInnerRadius + ringOuterRadius) / 2;
          const r = ringCenterRadius + labelOffsetOutward;

          labelGroup
            .append("circle")
            .attr("cx", 0)
            .attr("cy", -r)
            .attr("r", 10)
            .attr("fill", "#000")
            .attr("opacity", 0.9);
          labelGroup
            .append("text")
            .attr("x", 0)
            .attr("y", -r)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", 12)
            .attr("fill", "#fff")
            .attr("font-weight", 700)
            .text(scoreLabel);
        }
      }
    }

    // --- Center legend ---
    g.append("circle")
      .attr("r", innerRadius - 2)
      .attr("fill", "#fff")
      .attr("stroke", "#000")
      .attr("stroke-width", 2);
    g.append("text")
      .attr("y", -innerRadius + 45)
      .attr("text-anchor", "middle")
      .attr("font-size", 16)
      .attr("font-weight", 700)
      .attr("fill", "#1e293b")
      .text("DIMENSIONS");

    DIMENSIONS.forEach((dim, i) => {
      const yPos = -innerRadius + 50 + i * 30;
      g.append("circle")
        .attr("cx", -innerRadius + 80)
        .attr("cy", yPos + 35)
        .attr("r", 12)
        .attr("fill", dim.color)
        .attr("opacity", 0.9);
      g.append("text")
        .attr("x", -innerRadius + 80)
        .attr("y", yPos + 35)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 15)
        .attr("font-weight", 700)
        .attr("fill", "#fff")
        .text(i + 1);
      g.append("text")
        .attr("x", -innerRadius + 100)
        .attr("y", yPos + 39)
        .attr("text-anchor", "start")
        .attr("font-size", 15)
        .attr("font-weight", 600)
        .attr("fill", dim.color)
        .text(dim.shortKey);
    });
  }, [cells, width, height]);

  return { ref };
}

// ---------------- Main Component ----------------
type Props = { rows: QuestionnaireRow[]; sector: string };

export default function SdgGridRouletteVisualization({ rows, sector }: Props) {
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Observe container width and compute a good height that auto-fits page/padding
  useEffect(() => {
    if (!cardRef.current) return;
    const el = cardRef.current;

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const cw = Math.floor(entry.contentRect.width);
        // Make the viz roughly square, but limit extremes; add a tiny offset for padding
        const target = Math.max(700, Math.min(1300, cw));
        setSize({ w: target, h: target }); // square; change ratio here if needed
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cells = useMemo(() => makeCells(rows, sector), [rows, sector]);
  const { ref } = useGridRoulette({ cells, width: size.w, height: size.h });

  // Compute Performance by Dimension (vertical panel)
  const dimensionTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const d of DIMENSIONS) {
      totals[d.key] = cells
        .filter((c) => c.dim === d.key)
        .reduce((sum, c) => sum + c.score, 0);
    }
    return totals;
  }, [cells]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header + Sector */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-4">
          <h1 className="text-3xl font-bold text-gray-800">
            BIORADAR - Implementation Scorecard
          </h1>
          <div className="mt-4">
            <span className="text-sm text-gray-600 mr-2">Sector:</span>
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
              style={{ backgroundColor: "#eef2ff", color: "#3730a3" }}
            >
              {sector || "—"}
            </span>
          </div>
        </div>

        {/* Visualization (auto-fit) */}
        <div ref={cardRef} className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6">
          <svg
            ref={ref}
            width={size.w || "100%"}
            height={size.h || 800}
            style={{ display: "block", margin: "0 auto" }}
          />
        </div>

        {/* Performance by Dimension — vertical */}
        <div className="bg-white rounded-xl shadow-md p-5">
          <h3 className="font-semibold mb-4 text-gray-800">Performance by Dimension</h3>
          <div className="flex flex-col gap-4">
            {DIMENSIONS.map((d, idx) => {
              const score = dimensionTotals[d.key];
              const percentage = Math.round((score / 85) * 100);
              return (
                <div
                  key={d.key}
                  className="rounded-lg p-3 bg-gradient-to-r from-white to-slate-50 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow"
                      style={{ backgroundColor: d.color }}
                    >
                      {idx + 1}
                    </div>
                    <span className="font-medium text-sm text-gray-800">
                      {d.shortKey}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs mb-1 text-gray-600">
                    <span>Score: {score}/85</span>
                    <span className="font-bold text-gray-700">{percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="rounded-full h-2 transition-all duration-500"
                      style={{ width: `${percentage}%`, backgroundColor: d.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* End panel */}
      </div>
    </div>
  );
}
