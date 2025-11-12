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

const SDG_DESCRIPTIONS: Record<number, string> = {
  1: "No Poverty",
  2: "Zero Hunger",
  3: "Good Health and Well-being",
  4: "Quality Education",
  5: "Gender Equality",
  6: "Clean Water and Sanitation",
  7: "Affordable and Clean Energy",
  8: "Decent Work and Economic Growth",
  9: "Industry, Innovation and Infrastructure",
  10: "Reduced Inequalities",
  11: "Sustainable Cities and Communities",
  12: "Responsible Consumption and Production",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life on Land",
  16: "Peace, Justice and Strong Institutions",
  17: "Partnerships for the Goals",
};

const DIMENSIONS = [
  { key: "Economic Performance", color: "#DC2626", shortKey: "Economic" },
  { key: "Circular Performance", color: "#FFB800", shortKey: "Circular" },
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

    svg.attr("viewBox", `0 0 ${W} ${H}`)
       .attr("role", "img")
       .attr("aria-label", "SDG Performance Roulette Visualization showing scores across 17 Sustainable Development Goals and 4 dimensions");
    
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
            .attr("stroke", "#000")
            .attr("stroke-width", 0.5)
            .attr("opacity", level <= score ? 5 : 0.4)
            .attr("role", "graphics-symbol")
            .attr("aria-label", `SDG ${sdg} ${dim.shortKey} dimension score level ${level} of 5${level <= score ? ' - achieved' : ' - not achieved'}`);
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
            .attr("stroke-width", 0.5);
        }
      });

      // --- SDG icon ---
      const midAngle = (startAngle + endAngle) / 2;
      const iconAngle = midAngle + deg2rad(0);
      const iconRadius = outerRadius + 64;
      const icon = polar(iconRadius + 25, iconAngle);
      g.append("image")
        .attr("href", SDG_IMAGE_MAP[sdg])
        .attr("x", icon.x - 30)
        .attr("y", icon.y - 40)
        .attr("width", 60)
        .attr("height", 70)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("aria-label", `SDG ${sdg}: ${SDG_DESCRIPTIONS[sdg]}`);

      // --- Dimension indices 1..4 ---
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
          .attr("stroke-width", 1)
          .attr("opacity", 0.95)
          .attr("aria-label", `Dimension ${i + 1}: ${dmeta.shortKey}`);

        g.append("text")
          .attr("x", p.x)
          .attr("y", p.y + 0.5)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("font-size", 12)
          .attr("font-weight", 700)
          .attr("fill", "#fff")
          .attr("aria-hidden", "true")
          .text(String(i + 1));
      }
    }

    // --- Draw ALL bold SDG separator lines AFTER segments (prevents overlapping) ---
    for (let sdg = 1; sdg <= 17; sdg++) {
      const startAngle = angleScale(sdg)!;
      const p1 = polar(innerRadius, startAngle);
      const p2 = polar(outerRadius, startAngle);
      g.append("line")
        .attr("x1", p1.x)
        .attr("y1", p1.y)
        .attr("x2", p2.x)
        .attr("y2", p2.y)
        .attr("stroke", "#000")
        .attr("stroke-width", 8)
        .attr("opacity", 0.9);
    }

    // --- Concentric rings ---
    for (let level = 0; level <= 5; level++) {
      const radius = innerRadius + level * scoreRadiusWidth;
      g.append("circle")
        .attr("r", radius)
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", level === 0 || level === 5 ? 6 : 3)
        .attr("opacity", level === 0 || level === 5 ? 2 : 1)
        .attr("aria-label", level === 0 ? "Inner boundary" : level === 5 ? "Outer boundary" : `Score level ${level}`);
    }

    // --- Score labels ONLY at SDG 1 ---
    const labelOffsetOutward = scoreRadiusWidth * 0.35;
    const rightShift = deg2rad(5.5);
    const labelSDGs = [1];

    for (const sdg of labelSDGs) {
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
          .attr("aria-label", `Score level ${scoreLabel}`)
          .text(scoreLabel);
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
        .attr("aria-hidden", "true")
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
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    const el = cardRef.current;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cw = Math.floor(entry.contentRect.width);
        const target = Math.max(700, Math.min(1300, cw));
        setSize({ w: target, h: target });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cells = useMemo(() => makeCells(rows, sector), [rows, sector]);
  const { ref } = useGridRoulette({ cells, width: size.w, height: size.h });

  const dimensionTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const d of DIMENSIONS) {
      totals[d.key] = cells
        .filter((c) => c.dim === d.key)
        .reduce((sum, c) => sum + c.score, 0);
    }
    return totals;
  }, [cells]);

  const sdgTotals = useMemo(() => {
    const totals: Array<{ sdg: number; score: number; description: string }> = [];
    for (let sdg = 1; sdg <= 17; sdg++) {
      const score = cells
        .filter((c) => c.sdg === sdg)
        .reduce((sum, c) => sum + c.score, 0);
      totals.push({
        sdg,
        score,
        description: SDG_DESCRIPTIONS[sdg] || `SDG ${sdg}`,
      });
    }
    return totals.sort((a, b) => b.score - a.score);
  }, [cells]);

  const topSDGs = sdgTotals.slice(0, 2);
  const bottomSDGs = sdgTotals.slice(-2).reverse();

  const handleDownloadCSV = () => {
    if (!rows || rows.length === 0) {
      alert("No data available to download");
      return;
    }

    try {
      const headers = ["SDG", "Sustainability Dimension", "Question", "Score"];
      const csvRows = rows.map((row) => {
        const sdg = row.sdg_number || "";
        const dimension = row.sustainability_dimension || "";
        const question = (row.question || "").replace(/"/g, '""');
        const score = row.score !== undefined ? row.score : "";

        return [
          `"${sdg}"`,
          `"${dimension}"`,
          `"${question}"`,
          `"${score}"`,
        ].join(",");
      });

      const csvContent = [headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `SDG_Assessment_${sector}_${timestamp}.csv`;

      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`✅ Downloaded: ${filename}`);
    } catch (error) {
      console.error("CSV download error:", error);
      alert("Failed to download CSV. Please try again.");
    }
  };

  const handleDownloadChart = async () => {
    if (!ref.current) {
      alert("Chart not available");
      return;
    }

    setIsDownloading(true);

    try {
      const svgElement = ref.current.cloneNode(true) as SVGSVGElement;
      
      // Get all image elements
      const images = svgElement.querySelectorAll("image");
      
      // Load all images into canvas first, then convert to base64
      const imagePromises = Array.from(images).map(async (imgEl) => {
        const href = imgEl.getAttribute("href");
        if (!href || href.startsWith("data:")) return;
        
        try {
          // Use CORS proxy or load through Image element
          const imgElement = new Image();
          imgElement.crossOrigin = "anonymous";
          
          await new Promise<void>((resolve, reject) => {
            imgElement.onload = () => resolve();
            imgElement.onerror = () => reject(new Error("Failed to load"));
            imgElement.src = href;
          });
          
          // Convert loaded image to base64
          const canvas = document.createElement("canvas");
          canvas.width = imgElement.width;
          canvas.height = imgElement.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(imgElement, 0, 0);
            const base64 = canvas.toDataURL("image/png");
            imgEl.setAttribute("href", base64);
          }
        } catch (err) {
          console.warn("Failed to convert image:", href, err);
          // If conversion fails, try using a CORS proxy
          try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(href)}`;
            const response = await fetch(proxyUrl);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            imgEl.setAttribute("href", base64);
          } catch (proxyErr) {
            console.warn("Proxy also failed:", proxyErr);
          }
        }
      });

      await Promise.all(imagePromises);

      // Now convert to canvas
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        alert("Canvas not supported");
        setIsDownloading(false);
        return;
      }

      const img = new Image();
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = size.w || 1000;
        canvas.height = size.h || 1000;
        
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (!blob) {
            alert("Failed to generate image");
            setIsDownloading(false);
            return;
          }

          const link = document.createElement("a");
          const timestamp = new Date().toISOString().split("T")[0];
          const filename = `SDG_Chart_${sector}_${timestamp}.png`;
          
          const downloadUrl = URL.createObjectURL(blob);
          link.setAttribute("href", downloadUrl);
          link.setAttribute("download", filename);
          link.style.visibility = "hidden";

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);

          console.log(`✅ Downloaded: ${filename}`);
          setIsDownloading(false);
        }, "image/png");
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        alert("Failed to load chart for download");
        setIsDownloading(false);
      };

      img.src = url;
    } catch (error) {
      console.error("Chart download error:", error);
      alert("Failed to download chart. Please try again.");
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={handleDownloadCSV}
              disabled={!rows || rows.length === 0}
              aria-label="Download SDG assessment scores as CSV file"
              className={`px-4 py-2 bg-green-600 text-white rounded-lg transition flex items-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                !rows || rows.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-green-700"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download Score
            </button>
          </div>

          <div ref={cardRef}>
            <svg
              ref={ref}
              width={size.w || "100%"}
              height={size.h || 800}
              style={{ display: "block", margin: "0 auto" }}
            />
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleDownloadChart}
              disabled={!size.w || isDownloading}
              aria-label="Download SDG chart as PNG image"
              className={`px-4 py-2 bg-green-600 text-white rounded-lg transition flex items-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                !size.w || isDownloading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-green-700"
              }`}
            >
              {isDownloading ? (
                <>
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Preparing...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Download Chart
                </>
              )}
            </button>
          </div>
        </div>

        <section className="bg-white rounded-xl shadow-md p-6" aria-labelledby="performance-heading">
          <h2 id="performance-heading" className="text-2xl font-bold mb-6 text-gray-800">
            Performance
          </h2>

          <div className="mb-8">
            <h3 className="font-semibold mb-4 text-gray-800 text-lg" id="dimension-heading">
              By Dimension
            </h3>
            <div className="flex flex-col gap-4" role="list" aria-labelledby="dimension-heading">
              {DIMENSIONS.map((d, idx) => {
                const score = dimensionTotals[d.key];
                const percentage = Math.round((score / 85) * 100);
                return (
                  <div
                    key={d.key}
                    className="rounded-lg p-3 bg-gradient-to-r from-white to-slate-50 shadow-sm"
                    role="listitem"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow"
                        style={{ backgroundColor: d.color }}
                        aria-label={`Dimension ${idx + 1}`}
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
                    <div
                      className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${d.shortKey} performance: ${percentage}%`}
                    >
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

          <div>
            <h3 className="font-semibold mb-4 text-gray-800 text-lg" id="sdg-heading">
              By SDG
            </h3>

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-green-700 mb-3" id="best-sdg-heading">
                Best Performing
              </h4>
              <div className="flex flex-col gap-3" role="list" aria-labelledby="best-sdg-heading">
                {topSDGs.map((sdg) => {
                  const percentage = Math.round((sdg.score / 20) * 100);
                  return (
                    <div
                      key={sdg.sdg}
                      className="rounded-lg p-3 bg-gradient-to-r from-green-50 to-white shadow-sm border border-green-100"
                      role="listitem"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          src={SDG_IMAGE_MAP[sdg.sdg]}
                          alt={`SDG ${sdg.sdg}: ${sdg.description}`}
                          className="w-10 h-10 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-gray-800">
                            SDG {sdg.sdg}: {sdg.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs mb-1 text-gray-600">
                        <span>Score: {sdg.score}/20</span>
                        <span className="font-bold text-green-700">{percentage}%</span>
                      </div>
                      <div
                        className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`SDG ${sdg.sdg} ${sdg.description} performance: ${percentage}%`}
                      >
                        <div
                          className="rounded-full h-2 transition-all duration-500 bg-green-600"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-red-700 mb-3" id="lowest-sdg-heading">
                Lowest Performing
              </h4>
              <div className="flex flex-col gap-3" role="list" aria-labelledby="lowest-sdg-heading">
                {bottomSDGs.map((sdg) => {
                  const percentage = Math.round((sdg.score / 20) * 100);
                  return (
                    <div
                      key={sdg.sdg}
                      className="rounded-lg p-3 bg-gradient-to-r from-red-50 to-white shadow-sm border border-red-100"
                      role="listitem"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          src={SDG_IMAGE_MAP[sdg.sdg]}
                          alt={`SDG ${sdg.sdg}: ${sdg.description}`}
                          className="w-10 h-10 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-gray-800">
                            SDG {sdg.sdg}: {sdg.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs mb-1 text-gray-600">
                        <span>Score: {sdg.score}/20</span>
                        <span className="font-bold text-red-700">{percentage}%</span>
                      </div>
                      <div
                        className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`SDG ${sdg.sdg} ${sdg.description} performance: ${percentage}%`}
                      >
                        <div
                          className="rounded-full h-2 transition-all duration-500 bg-red-600"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}