"use client";
import React, { use, useEffect, useMemo, useRef, useState } from "react";
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

type UploadExcelResponse = {
  success: boolean;
  data: Record<string, { rows: QuestionnaireRow[] }>;
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

// Distinct colors for each SDG
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

// Dimensions with consistent colors that will be used for scoring
const DIMENSIONS = [
  {
    key: "Economic Performance",
    color: "#FFB800",
    shortKey: "Economic"
  },
  {
    key: "Circular Performance",
    color: "#9B59B6",
    shortKey: "Circular"
  },
  {
    key: "Environmental Performance",
    color: "#27AE60",
    shortKey: "Environmental"
  },
  {
    key: "Social Performance",
    color: "#3498DB",
    shortKey: "Social"
  },
] as const;

// ---------------- Helpers ----------------
function canonicalSector(s?: string | null) {
  if (!s) return null;
  const t = s.toLowerCase();
  if (t.includes("textile")) return "Textiles";
  if (t.includes("fertil")) return "Fertilizers";
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
    const outerRadius = Math.min(W, H) / 2 - 50;
    const innerRadius = 120; // Increased for center legend

    svg.attr("viewBox", `0 0 ${W} ${H}`);

    const g = svg.append("g")
      .attr("transform", `translate(${W / 2},${H / 2})`);

    // Create scales for SDG segments (pie slices)
    const angleScale = d3.scaleBand<number>()
      .domain(d3.range(1, 18))
      .range([0, 2 * Math.PI])
      .paddingInner(0.01);

    // Calculate scoreRadiusWidth first
    const scoreRadiusWidth = (outerRadius - innerRadius) / 6;

    // Draw each SDG segment
    for (let sdg = 1; sdg <= 17; sdg++) {
      const startAngle = angleScale(sdg)!;
      const endAngle = startAngle + angleScale.bandwidth();
      const segmentAngle = angleScale.bandwidth();

      // Create 4 vertical sub-cuts for dimensions
      const dimensionAngleWidth = segmentAngle / 4;

      // Draw the grid for this SDG
      DIMENSIONS.forEach((dim, dimIndex) => {
        const dimStartAngle = startAngle + (dimIndex * dimensionAngleWidth);
        const dimEndAngle = dimStartAngle + dimensionAngleWidth;

        // Find the cell data for this SDG and dimension
        const cellData = cells.find(c => c.sdg === sdg && c.dim === dim.key);
        const score = cellData ? cellData.score : 0;

        // Draw all 6 score levels (0-5) as horizontal bands
        for (let level = 0; level <= 5; level++) {
          const levelInnerRadius = innerRadius + (level * scoreRadiusWidth);
          const levelOuterRadius = levelInnerRadius + scoreRadiusWidth;

          // Create the arc for this grid cell
          const arc = d3.arc()
            .innerRadius(levelInnerRadius)
            .outerRadius(levelOuterRadius)
            .startAngle(dimStartAngle)
            .endAngle(dimEndAngle)
            .padAngle(0);

          // Determine fill based on whether this level is within the score
          let fillColor = "#f9fafb"; // Very light gray for empty cells
          let opacity = 1;

          if (level === 0) {
            // Level 0 is always empty/gray
            fillColor = "#f3f4f6";
            opacity = 0.5;
          } else if (level <= score) {
            // Filled with DIMENSION color if within score range
            fillColor = dim.color;
            opacity = 0.6 + (level * 0.08); // Gradual opacity increase
          }

          const cell = g.append("path")
            .attr("d", arc as any)
            .attr("fill", fillColor)
            .attr("opacity", opacity)
            .attr("stroke", "#000")
            .attr("stroke-width", 0.3)
            .style("cursor", level > 0 && level <= score ? "pointer" : "default");

          // Add interactivity only for filled cells
          if (level > 0 && level <= score && cellData) {
            cell
              .on("mouseenter", function () {
                d3.select(this)
                  .transition()
                  .duration(150)
                  .attr("opacity", 1)
                  .attr("stroke-width", 1.5)
                  .attr("stroke", dim.color);
                setHoveredCell(cellData);
              })
              .on("mouseleave", function () {
                d3.select(this)
                  .transition()
                  .duration(150)
                  .attr("opacity", opacity)
                  .attr("stroke-width", 0.3)
                  .attr("stroke", "#000");
                setHoveredCell(null);
              })
              .on("click", () => {
                if (onCellClick) onCellClick(cellData);
              });
          }
        }
        // Draw vertical dimension separator lines (lighter)
        if (dimIndex > 0) {
          g.append("line")
            .attr("x1", Math.cos(dimStartAngle - Math.PI / 2) * innerRadius)
            .attr("y1", Math.sin(dimStartAngle - Math.PI / 2) * innerRadius)
            .attr("x2", Math.cos(dimStartAngle - Math.PI / 2) * outerRadius)
            .attr("y2", Math.sin(dimStartAngle - Math.PI / 2) * outerRadius)
            .attr("stroke", "#000")
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.3);
        }
      });

      // Draw bold radial lines to separate SDGs
      g.append("line")
        .attr("x1", Math.cos(startAngle - Math.PI / 2) * innerRadius)
        .attr("y1", Math.sin(startAngle - Math.PI / 2) * innerRadius)
        .attr("x2", Math.cos(startAngle - Math.PI / 2) * outerRadius)
        .attr("y2", Math.sin(startAngle - Math.PI / 2) * outerRadius)
        .attr("stroke", "#000")
        .attr("stroke-width", 2)
        .attr("opacity", 0.8);

      // SDG labels outside with background
      const midAngle = (startAngle + endAngle) / 2;
      const labelRadius = outerRadius + 25;

      // Background circle for SDG number
      g.append("circle")
        .attr("cx", Math.cos(midAngle - Math.PI / 2) * labelRadius)
        .attr("cy", Math.sin(midAngle - Math.PI / 2) * labelRadius)
        .attr("r", 12)
        .attr("fill", SDG_COLORS[sdg])
        .attr("opacity", 0.9);

      // SDG number
      g.append("text")
        .attr("x", Math.cos(midAngle - Math.PI / 2) * labelRadius)
        .attr("y", Math.sin(midAngle - Math.PI / 2) * labelRadius)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#fff")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .text(sdg);
    }

    // Draw concentric circles for score levels with bolder lines
    for (let level = 0; level <= 6; level++) {
      const radius = innerRadius + (level * scoreRadiusWidth);
      g.append("circle")
        .attr("r", radius)
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", level === 0 || level === 6 ? 2 : 1)
        .attr("opacity", level === 0 || level === 6 ? 0.8 : 0.4);

      // Add score labels
      if (level > 0 && level < 6) {
        // Add white background for better readability
        g.append("rect")
          .attr("x", 2)
          .attr("y", -radius - 2)
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", "#fff")
          .attr("opacity", 0.9);

        g.append("text")
          .attr("x", 8)
          .attr("y", -radius + 5)
          .attr("text-anchor", "middle")
          .attr("font-size", "10px")
          .attr("fill", "#000")
          .attr("font-weight", "bold")
          .text(level);
      }
    }

    // Center circle with dimension legend
    g.append("circle")
      .attr("r", innerRadius - 2)
      .attr("fill", "#fff")
      .attr("stroke", "#000")
      .attr("stroke-width", 2);

    // Title
    g.append("text")
      .attr("y", -innerRadius + 45)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("fill", "#1e293b")
      .text("DIMENSIONS");

    // Dimension legend in center
    DIMENSIONS.forEach((dim, i) => {
      const yPos = -innerRadius + 50 + (i * 30);

      // Colored circle
      g.append("circle")
        .attr("cx", -innerRadius + 80)
        .attr("cy", yPos + 35)
        .attr("r", 12)
        .attr("fill", dim.color)
        .attr("opacity", 0.8);

      // Number
      g.append("text")
        .attr("x", -innerRadius + 80)
        .attr("y", yPos + 35)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "15px")
        .attr("font-weight", "bold")
        .attr("fill", "#fff")
        .text(i + 1);

      // Name
      g.append("text")
        .attr("x", -innerRadius + 100)
        .attr("y", yPos + 39)
        .attr("text-anchor", "start")
        .attr("font-size", "15px")
        .attr("font-weight", "600")
        .attr("fill", dim.color)
        .text(dim.shortKey);

    });

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

  // Calculate dimension totals
  const dimensionTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    DIMENSIONS.forEach(d => {
      totals[d.key] = cells
        .filter(c => c.dim === d.key)
        .reduce((sum, c) => sum + c.score, 0);
    });
    return totals;
  }, [cells]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                SDG Grid Roulette
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Sustainability Assessment Matrix: 17 SDGs - 4 Dimensions - 6 Score Levels
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Roulette Visualization */}
          <div className="xl:col-span-3 bg-white rounded-xl shadow-md p-6">
            <svg ref={ref} width="100%" height="700" />
          </div>

          {/* Info Panel */}
          <div className="space-y-4">
            {/* Hover Info */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold mb-3 text-gray-800">Cell Details</h3>
              {hoveredCell ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: SDG_COLORS[hoveredCell.sdg] + "20" }}>
                    <p className="text-sm font-bold" style={{ color: SDG_COLORS[hoveredCell.sdg] }}>
                      SDG {hoveredCell.sdg}
                    </p>
                    <p className="text-xs text-gray-700 mt-1">
                      {SDG_SHORT[hoveredCell.sdg]}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Dimension:</span>
                      <span
                        className="font-medium px-2 py-1 rounded text-white text-xs"
                        style={{ backgroundColor: DIMENSIONS.find(d => d.key === hoveredCell.dim)?.color }}
                      >
                        {hoveredCell.dim.split(' ')[0]}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Score:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(level => (
                          <div
                            key={level}
                            className="w-4 h-4 rounded-sm border border-gray-400"
                            style={{
                              backgroundColor: level <= hoveredCell.score
                                ? DIMENSIONS.find(d => d.key === hoveredCell.dim)?.color
                                : "#f3f4f6",
                              opacity: level <= hoveredCell.score ? 0.6 + (level * 0.08) : 0.3
                            }}
                          />
                        ))}
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

            {/* Dimension Performance */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5">
              <h3 className="font-semibold mb-3 text-gray-800">Performance by Dimension</h3>
              <div className="space-y-3">
                {DIMENSIONS.map((d, idx) => {
                  const score = dimensionTotals[d.key];
                  const percentage = Math.round((score / 85) * 100);
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
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: d.color
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}