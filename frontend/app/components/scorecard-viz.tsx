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
const SDG_SHORT: Record<number, string> = {
  1: "No Poverty",
  2: "Zero Hunger",
  3: "Good Health & Well-being",
  4: "Quality Education",
  5: "Gender Equality",
  6: "Clean Water & Sanitation",
  7: "Affordable & Clean Energy",
  8: "Decent Work & Economic Growth",
  9: "Industry, Innovation & Infrastructure",
  10: "Reduced Inequalities",
  11: "Sustainable Cities & Communities",
  12: "Responsible Consumption & Production",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life on Land",
  16: "Peace, Justice & Strong Institutions",
  17: "Partnerships for the Goals",
};

// SDG icons
const SDG_IMAGE_MAP: Record<number, string> = {
  1: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/132ea41f-4040-48ef-81e6-a942e78402b9",
  2: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/398dbeec-5c22-462d-bc89-0710a65a8ad9",
  3: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/4f9b5639-b680-4b4e-8ed5-bafb75be6cea",
  4: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/fa2fea1f-23e0-4c18-961f-8c492a48e170",
  5: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/ab98444d-a129-4bd0-8427-b0d2d69abe2a",
  6: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/35ea17dc-31ff-47d7-b22a-6445d22fc1f6",
  7: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/4095422d-f496-44dc-b7bc-1ca065dfd56f",
  8: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/7b8ad482-c6fb-464a-a713-f524add285bb",
  9: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/92270d6f-ede2-455a-8b15-fe4168f447a9",
  10: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/9e3239b3-c3c9-47b1-bab4-d248ff15e2e7",
  11: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/65636295-3a0d-485c-9243-068c7a549ccd",
  12: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/be850d28-c1f1-4268-b74c-ca34c3391ef8",
  13: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/46c7a45d-9ae6-4e3f-8b1d-6ca3d3be9cd9",
  14: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/87a18e9f-442f-46d8-b449-794aaffed336",
  15: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/a7650bea-4b2d-47e7-8660-fabad45badf0",
  16: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/cf11c3a3-bd84-4558-9f4c-d20ea3e8856c",
  17: "https://hive.forms.usercontent.microsoft/images/54d63e24-ac6d-4c5e-a8d6-ba978a0b286e/5d9fc63b-a62d-4897-99d0-d701dd178325/T6N2DXTAH45TTE4AOX8BRXCFKI/e00ca088-236c-46ea-85db-c120c35ee7a4",
};

const SDG_COLORS: Record<number, string> = {
  1: "#E5243B",
  2: "#DDA63A",
  3: "#4C9F38",
  4: "#C5192D",
  5: "#FF3A21",
  6: "#26BDE2",
  7: "#FCC30B",
  8: "#A21942",
  9: "#FD6925",
  10: "#DD1367",
  11: "#FD9D24",
  12: "#BF8B2E",
  13: "#3F7E44",
  14: "#0A97D9",
  15: "#56C02B",
  16: "#00689D",
  17: "#19486A",
};

// Dimensions
const DIMENSIONS = [
  { key: "Economic Performance", color: "#FFB800", shortKey: "Economic" },
  { key: "Circular Performance", color: "#9B59B6", shortKey: "Circular" },
  { key: "Environmental Performance", color: "#27AE60", shortKey: "Environmental" },
  { key: "Social Performance", color: "#3498DB", shortKey: "Social" },
] as const;

// Fallback rubric
const DEFAULT_RUBRIC: Record<number, string> = {
  0: "N/A",
  1: "Issue identified, but no plans for further actions",
  2: "Issue identified, starts planning further actions",
  3: "Action plan with clear targets and deadlines in place",
  4: "Action plan operational - partial implementation underway",
  5: "Fully implemented and monitored for impact",
};

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

// ---------------- Grid-based Roulette Visualization ----------------
function useGridRoulette({
  cells,
  width = 900,
  height = 900,
  onCellClick
}: {
  cells: Cell[];
  width?: number;
  height?: number;
  onCellClick?: (cell: Cell) => void;
}) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [hoveredCell, setHoveredCell] = useState<Cell | null>(null);

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const W = width, H = height;
    const outerRadius = Math.min(W, H) / 2 - 70;
    const innerRadius = 120;

    svg.attr("viewBox", `0 0 ${W} ${H}`);

    const g = svg.append("g")
      .attr("transform", `translate(${W / 2},${H / 2})`);

    // Angle scale (17 SDGs)
    const angleScale = d3.scaleBand<number>()
      .domain(d3.range(1, 18))
      .range([0, 2 * Math.PI])
      .paddingInner(0.01);

    const scoreRadiusWidth = (outerRadius - innerRadius) / 6;

    const polar = (r: number, a: number) => ({
      x: Math.cos(a - Math.PI / 2) * r,
      y: Math.sin(a - Math.PI / 2) * r,
    });

    // --- Draw SDG segments + grid ---
    for (let sdg = 1; sdg <= 17; sdg++) {
      const startAngle = angleScale(sdg)!;
      const endAngle = startAngle + angleScale.bandwidth();
      const segmentAngle = angleScale.bandwidth();
      const dimensionAngleWidth = segmentAngle / 4;

      DIMENSIONS.forEach((dim, dimIndex) => {
        const dimStartAngle = startAngle + dimIndex * dimensionAngleWidth;
        const dimEndAngle = dimStartAngle + dimensionAngleWidth;

        const cellData = cells.find(c => c.sdg === sdg && c.dim === dim.key);
        const score = cellData ? cellData.score : 0;

        // Bands for score levels (0–5)
        for (let level = 0; level <= 5; level++) {
          const levelInnerRadius = innerRadius + level * scoreRadiusWidth;
          const levelOuterRadius = levelInnerRadius + scoreRadiusWidth;

          const arc = d3.arc()
            .innerRadius(levelInnerRadius)
            .outerRadius(levelOuterRadius)
            .startAngle(dimStartAngle)
            .endAngle(dimEndAngle)
            .padAngle(0);

          let fillColor = "#f9fafb";
          let opacity = 1;
          if (level === 0) { fillColor = "#f3f4f6"; opacity = 0.5; }
          else if (level <= score) { fillColor = dim.color; opacity = 0.6 + level * 0.08; }

          const cell = g.append("path")
            .attr("d", arc as any)
            .attr("fill", fillColor)
            .attr("opacity", opacity)
            .attr("stroke", "#000")
            .attr("stroke-width", 0.3)
            .style("cursor", level > 0 && level <= score ? "pointer" : "default");

          if (level > 0 && level <= score && cellData) {
            cell
              .on("mouseenter", function () {
                d3.select(this)
                  .transition().duration(150)
                  .attr("opacity", 1)
                  .attr("stroke-width", 1.5)
                  .attr("stroke", dim.color);
                setHoveredCell(cellData);
              })
              .on("mouseleave", function () {
                d3.select(this)
                  .transition().duration(150)
                  .attr("opacity", opacity)
                  .attr("stroke-width", 0.3)
                  .attr("stroke", "#000");
                setHoveredCell(null);
              })
              .on("click", () => onCellClick && onCellClick(cellData));
          }
        }

        // Light dimension separators
        if (dimIndex > 0) {
          const p1 = polar(innerRadius, dimStartAngle);
          const p2 = polar(outerRadius, dimStartAngle);
          g.append("line")
            .attr("x1", p1.x).attr("y1", p1.y)
            .attr("x2", p2.x).attr("y2", p2.y)
            .attr("stroke", "#000")
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.3);
        }
      });

      // SDG icon outside
      const midAngle = (startAngle + endAngle) / 2;
      const icon = polar(outerRadius + 40, midAngle);
      g.append("image")
        .attr("href", SDG_IMAGE_MAP[sdg])
        .attr("x", icon.x - 12)
        .attr("y", icon.y - 12)
        .attr("width", 40)
        .attr("height", 40)
        .attr("preserveAspectRatio", "xMidYMid meet");
    }

    // --- Concentric circles (back) ---
    for (let level = 0; level <= 6; level++) {
      const radius = innerRadius + level * scoreRadiusWidth;
      g.append("circle")
        .attr("r", radius)
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", level === 0 || level === 6 ? 2 : 1)
        .attr("opacity", level === 0 || level === 6 ? 0.8 : 0.4);
    }

    // --- Score labels: at EVERY SDG separator, in SAME local position as original ---
    // We rotate a subgroup to the SDG separator angle, then draw labels at (x=2, y=-radius-2)
    for (let sdg = 1; sdg <= 17; sdg++) {
      const sepAngle = angleScale(sdg)!;                 // radians
      const deg = (sepAngle * 180) / Math.PI;            // convert to degrees
      const labelGroup = g.append("g").attr("transform", `rotate(${deg})`);

      for (let level = 1; level < 6; level++) {
        const radius = innerRadius + level * scoreRadiusWidth;

        // Background badge
        labelGroup.append("rect")
          .attr("x", 2)
          .attr("y", -radius - 2)
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", "#fff")
          .attr("opacity", 0.9);

        // Number
        labelGroup.append("text")
          .attr("x", 8)
          .attr("y", -radius + 5)
          .attr("text-anchor", "middle")
          .attr("font-size", "10px")
          .attr("fill", "#000")
          .attr("font-weight", "bold")
          .text(level);
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
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("fill", "#1e293b")
      .text("DIMENSIONS");

    DIMENSIONS.forEach((dim, i) => {
      const yPos = -innerRadius + 50 + i * 30;

      // colored circle
      g.append("circle")
        .attr("cx", -innerRadius + 80)
        .attr("cy", yPos + 35)
        .attr("r", 12)
        .attr("fill", dim.color)
        .attr("opacity", 0.8);

      // number text (keep as-is; your “Not other one” note was about score labels)
      g.append("text")
        .attr("x", -innerRadius + 80)
        .attr("y", yPos + 35)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "15px")
        .attr("font-weight", "bold")
        .attr("fill", "#fff")
        .text(i + 1);

      // name
      g.append("text")
        .attr("x", -innerRadius + 100)
        .attr("y", yPos + 39)
        .attr("text-anchor", "start")
        .attr("font-size", "15px")
        .attr("font-weight", "600")
        .attr("fill", dim.color)
        .text(dim.shortKey);
    });

    // --- Bold SDG separators last (on top) ---
    for (let sdg = 1; sdg <= 17; sdg++) {
      const a = angleScale(sdg)!;
      const p1 = polar(innerRadius, a);
      const p2 = polar(outerRadius, a);
      g.append("line")
        .attr("x1", p1.x).attr("y1", p1.y)
        .attr("x2", p2.x).attr("y2", p2.y)
        .attr("stroke", "#000")
        .attr("stroke-width", 2)
        .attr("opacity", 0.95);
    }

  }, [cells, width, height, onCellClick]);

  return { ref, hoveredCell };
}

// ---------------- Main Component ----------------
type Props = { rows: QuestionnaireRow[]; sector: string };

export default function SdgGridRouletteVisualization({ rows, sector }: Props) {
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const cells = useMemo(() => makeCells(rows, sector), [rows, sector]);

  const { ref, hoveredCell } = useGridRoulette({
    cells,
    onCellClick: (cell) => setSelectedCell(cell)
  });

  // Dimension totals
  const dimensionTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    DIMENSIONS.forEach(d => {
      totals[d.key] = cells
        .filter(c => c.dim === d.key)
        .reduce((sum, c) => sum + c.score, 0);
    });
    return totals;
  }, [cells]);

  const PANEL_CLASS = "bg-white rounded-xl shadow-md p-5 overflow-hidden";

  // derive details for the hovered cell (clean, full-width typography)
  const hoveredDetails = useMemo(() => {
    if (!hoveredCell) return null;
    const first =
      hoveredCell.items.find(i => i && i.question) ??
      hoveredCell.items[0] ??
      ({} as QuestionnaireRow);
    const sectorVal = canonicalSector(first?.sector ?? undefined) ?? "—";
    const questionVal = first?.question || "—";
    const scoreDesc =
      first?.score_description || DEFAULT_RUBRIC[hoveredCell.score] || "—";
    const sdgTitle = SDG_SHORT[hoveredCell.sdg] || "";
    return { sectorVal, questionVal, scoreDesc, sdgTitle };
  }, [hoveredCell]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">
              BIORADAR - Implementation Scorecard
            </h1>
          </div>
        </div>

        {/* Chart & Panels */}
        <div className="grid grid-cols-1 gap-6">
          {/* Roulette Visualization */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <svg ref={ref} width="100%" height="700" />
          </div>

          {/* Cell Details (vertical, fits inside, scrolls if long) */}
          <div className={`${PANEL_CLASS} h-full flex flex-col`}>
            <h3 className="font-semibold mb-3 text-gray-800">Cell Details</h3>
            {hoveredCell ? (
              <div className="space-y-3">
                {/* SDG title */}
                <div className="p-3 rounded-lg" style={{ backgroundColor: SDG_COLORS[hoveredCell.sdg] + "20" }}>
                  <p className="text-sm font-bold" style={{ color: SDG_COLORS[hoveredCell.sdg] }}>
                    SDG {hoveredCell.sdg}
                  </p>
                  <p className="text-xs text-gray-700 mt-1">
                    {SDG_SHORT[hoveredCell.sdg]}
                  </p>
                </div>

                <div className="space-y-2">
                  {/* Dimension */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Dimension:</span>
                    <span
                      className="font-medium px-2 py-1 rounded text-white text-xs"
                      style={{ backgroundColor: DIMENSIONS.find(d => d.key === hoveredCell.dim)?.color }}
                    >
                      {hoveredCell.dim.split(' ')[0]}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Score:</span>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg"
                      style={{ backgroundColor: DIMENSIONS.find(d => d.key === hoveredCell.dim)?.color }}
                    >
                      {hoveredCell.score}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Hover over filled cells to see details
              </p>
            )}
          </div>


          {/* Performance by Dimension (same clean style) */}
          <div className={`${PANEL_CLASS} h-full flex flex-col`}>
            <h3 className="font-semibold mb-3 text-gray-800">
              Performance by Dimension
            </h3>
            <div className="flex-1 space-y-3">
              {DIMENSIONS.map((d, idx) => {
                const score = dimensionTotals[d.key];
                const percentage = Math.round((score / 85) * 100); // 17 SDGs * 5
                return (
                  <div key={d.key} className="bg-white rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: d.color }}
                      >
                        {idx + 1}
                      </div>
                      <span className="font-medium text-sm">{d.shortKey}</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Score: {score}/85</span>
                      <span className="font-bold">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
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
        </div>{/* /panels */}
      </div>
    </div>
  );
}
