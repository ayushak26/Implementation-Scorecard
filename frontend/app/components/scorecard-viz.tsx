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
  1: "/sdg-icons/sdg-1.png",
  2: "/sdg-icons/sdg-2.png",
  3: "/sdg-icons/sdg-3.png",
  4: "/sdg-icons/sdg-4.png",
  5: "/sdg-icons/sdg-5.png",
  6: "/sdg-icons/sdg-6.png",
  7: "/sdg-icons/sdg-7.png",
  8: "/sdg-icons/sdg-8.png",
  9: "/sdg-icons/sdg-9.png",
  10: "/sdg-icons/sdg-10.png",
  11: "/sdg-icons/sdg-11.png",
  12: "/sdg-icons/sdg-12.png",
  13: "/sdg-icons/sdg-13.png",
  14: "/sdg-icons/sdg-14.png",
  15: "/sdg-icons/sdg-15.png",
  16: "/sdg-icons/sdg-16.png",
  17: "/sdg-icons/sdg-17.png",
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
  { key: "Economic Performance", color: "#3b82f6", shortKey: "Economic", number: 1 },
  { key: "Social Performance", color: "#fbbf24", shortKey: "Social", number: 2 },
  { key: "Environmental Performance", color: "#22c55e", shortKey: "Environmental", number: 3 },
  { key: "Circular Performance", color: "#f97316", shortKey: "Circular", number: 4 },
] as const;

const TOOLTIPS: Record<string, string> = {
  Economic: "Economic sustainability measures financial viability, cost efficiency, and economic growth",
  Social: "Social sustainability addresses labor practices, community impact, and social equity",
  Environmental: "Environmental sustainability focuses on ecological impact, resource conservation, and climate action",
  Circular: "Circular economy principles include waste reduction, material reuse, and closed-loop systems",
  SDG: "Sustainable Development Goals are 17 global objectives adopted by the UN to achieve a better future for all",
  Score: "Scores range from 0-5, where 5 represents full achievement of sustainability targets",
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

// -------------- Responsive Grid-based Roulette Visualization --------------
function useGridRoulette({ cells, width, height }: { cells: Cell[]; width: number; height: number }) {
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

    svg
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("role", "img")
      .attr("aria-label", "SDG Performance Roulette Visualization showing scores across 17 Sustainable Development Goals and 4 dimensions");

    const g = svg.append("g").attr("transform", `translate(${W / 2},${H / 2})`);

    const angleScale = d3.scaleBand<number>().domain(d3.range(1, 18)).range([0, 2 * Math.PI]).paddingInner(0.01);

    const scoreRadiusWidth = (outerRadius - innerRadius) / 5;
    const polar = (r: number, a: number) => ({ x: Math.cos(a - Math.PI / 2) * r, y: Math.sin(a - Math.PI / 2) * r });
    const deg2rad = (d: number) => (Math.PI / 180) * d;

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
          const arc = d3.arc().innerRadius(levelInnerRadius).outerRadius(levelOuterRadius).startAngle(dimStartAngle).endAngle(dimEndAngle);

          g.append("path")
            .attr("d", arc as any)
            .attr("fill", level <= score ? dim.color : "#f3f4f6")
            .attr("stroke", "none")
            .attr("opacity", level <= score ? 0.9 : 0.3);
        }
      });

      const midAngle = (startAngle + endAngle) / 2;
      const iconRadius = outerRadius + 64;
      const icon = polar(iconRadius + 25, midAngle);

      g.append("image")
        .attr("href", SDG_IMAGE_MAP[sdg])
        .attr("x", icon.x - 30)
        .attr("y", icon.y - 40)
        .attr("width", 60)
        .attr("height", 70);
    }

    for (let level = 0; level <= 5; level++) {
      const radius = innerRadius + level * scoreRadiusWidth;
      g.append("circle").attr("r", radius).attr("fill", "none").attr("stroke", "#ffffff").attr("stroke-width", level === 0 || level === 5 ? 3 : 1).attr("opacity", 0);
    }

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

        labelGroup.append("circle").attr("cx", 0).attr("cy", -r).attr("r", 10).attr("fill", "#000").attr("opacity", 0.9);
        labelGroup.append("text").attr("x", 0).attr("y", -r).attr("text-anchor", "middle").attr("dominant-baseline", "middle").attr("font-size", 12).attr("fill", "#fff").attr("font-weight", 700).text(scoreLabel);
      }
    }

    g.append("circle").attr("r", innerRadius - 2).attr("fill", "#fff").attr("stroke", "none");
    g.append("text").attr("y", -innerRadius + 45).attr("text-anchor", "middle").attr("font-size", 16).attr("font-weight", 700).attr("fill", "#1e293b").text("DIMENSIONS");

    DIMENSIONS.forEach((dim, i) => {
      const yPos = -innerRadius + 50 + i * 30;
      g.append("circle").attr("cx", -innerRadius + 80).attr("cy", yPos + 35).attr("r", 12).attr("fill", dim.color).attr("opacity", 0.9);
      g.append("text").attr("x", -innerRadius + 80).attr("y", yPos + 35).attr("text-anchor", "middle").attr("dominant-baseline", "middle").attr("font-size", 15).attr("font-weight", 700).attr("fill", "#fff").text(dim.number);
      g.append("text").attr("x", -innerRadius + 100).attr("y", yPos + 39).attr("text-anchor", "start").attr("font-size", 15).attr("font-weight", 600).attr("fill", dim.color).text(dim.shortKey);
    });
  }, [cells, width, height]);

  return { ref };
}

// -------------- Radar Chart --------------
function useRadarChart({ cells, dimension, width, height }: { cells: Cell[]; dimension: (typeof DIMENSIONS)[number]; width: number; height: number }) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!width || !height) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 60;

    svg.attr("viewBox", `0 0 ${width} ${height}`);
    const g = svg.append("g").attr("transform", `translate(${centerX},${centerY})`);

    const data: Array<{ sdg: number; score: number }> = [];
    for (let sdg = 1; sdg <= 17; sdg++) {
      const cell = cells.find((c) => c.sdg === sdg && c.dim === dimension.key);
      data.push({ sdg, score: cell ? cell.score : 0 });
    }

    const angleSlice = (Math.PI * 2) / 17;

    for (let level = 1; level <= 5; level++) {
      const r = (radius / 5) * level;
      g.append("circle").attr("r", r).attr("fill", "none").attr("stroke", "#e5e7eb").attr("stroke-width", 1).attr("opacity", 0.5);
    }

    for (let i = 0; i < 17; i++) {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      g.append("line").attr("x1", 0).attr("y1", 0).attr("x2", x).attr("y2", y).attr("stroke", "#e5e7eb").attr("stroke-width", 1).attr("opacity", 0.5);

      const labelRadius = radius + 25;
      const lx = Math.cos(angle) * labelRadius;
      const ly = Math.sin(angle) * labelRadius;
      g.append("text").attr("x", lx).attr("y", ly).attr("text-anchor", "middle").attr("dominant-baseline", "middle").attr("font-size", 10).attr("font-weight", 600).attr("fill", dimension.color).text(i + 1);
    }

    const radarLine = d3.lineRadial<{ sdg: number; score: number }>().angle((d, i) => angleSlice * i - Math.PI / 2).radius((d) => (radius / 5) * d.score).curve(d3.curveLinearClosed);

    g.append("path").datum(data).attr("d", radarLine as any).attr("fill", dimension.color).attr("fill-opacity", 0.3).attr("stroke", dimension.color).attr("stroke-width", 2);

    data.forEach((d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const r = (radius / 5) * d.score;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      g.append("circle").attr("cx", x).attr("cy", y).attr("r", 4).attr("fill", dimension.color).attr("stroke", "#fff").attr("stroke-width", 2);
    });
  }, [cells, dimension, width, height]);

  return { ref };
}

function EnlargedRadar({ cells, dimension }: { cells: Cell[]; dimension: (typeof DIMENSIONS)[number] }) {
  const { ref } = useRadarChart({ cells, dimension, width: 600, height: 600 });
  return <svg ref={ref} width={600} height={600} style={{ display: "block" }} />;
}

// ---------------- Tooltip Component ----------------
const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} className="cursor-help border-b border-dotted border-green-600">
        {children}
      </span>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg w-64">
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------- Main Component ----------------
type Props = { rows: QuestionnaireRow[]; sector: string };

export default function SdgGridRouletteVisualization({ rows, sector }: Props) {
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [radarSize, setRadarSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingRadar, setIsDownloadingRadar] = useState(false);
  const [selectedRadar, setSelectedRadar] = useState<number | null>(null);
  const [showRadarDownloadMenu, setShowRadarDownloadMenu] = useState(false);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const radarContainerRef = useRef<HTMLDivElement | null>(null);

  const safeRows = rows || [];

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

  useEffect(() => {
    if (!radarContainerRef.current) return;
    const el = radarContainerRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cw = Math.floor(entry.contentRect.width / 4) - 20;
        const target = Math.max(200, Math.min(300, cw));
        setRadarSize({ w: target, h: target });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cells = useMemo(() => makeCells(safeRows, sector), [safeRows, sector]);
  const { ref } = useGridRoulette({ cells, width: size.w, height: size.h });

  const economicRadar = useRadarChart({ cells, dimension: DIMENSIONS[0], width: radarSize.w, height: radarSize.h });
  const socialRadar = useRadarChart({ cells, dimension: DIMENSIONS[1], width: radarSize.w, height: radarSize.h });
  const environmentalRadar = useRadarChart({ cells, dimension: DIMENSIONS[2], width: radarSize.w, height: radarSize.h });
  const circularRadar = useRadarChart({ cells, dimension: DIMENSIONS[3], width: radarSize.w, height: radarSize.h });

  const radarRefs = [economicRadar.ref, socialRadar.ref, environmentalRadar.ref, circularRadar.ref];

  const dimensionTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const d of DIMENSIONS) {
      totals[d.key] = cells.filter((c) => c.dim === d.key).reduce((sum, c) => sum + c.score, 0);
    }
    return totals;
  }, [cells]);

  const sdgTotals = useMemo(() => {
    const totals: Array<{ sdg: number; score: number; description: string }> = [];
    for (let sdg = 1; sdg <= 17; sdg++) {
      const score = cells.filter((c) => c.sdg === sdg).reduce((sum, c) => sum + c.score, 0);
      totals.push({ sdg, score, description: SDG_DESCRIPTIONS[sdg] || `SDG ${sdg}` });
    }
    return totals.sort((a, b) => b.score - a.score);
  }, [cells]);

  const topSDGs = useMemo(() => sdgTotals.slice(0, 2), [sdgTotals]);
  const bottomSDGs = useMemo(() => [...sdgTotals].slice(-2).reverse(), [sdgTotals]);

  const handleDownloadCSV = () => {
    if (!safeRows || safeRows.length === 0) {
      alert("No data available to download");
      return;
    }

    try {
      const headers = ["SDG", "Sustainability Dimension", "Question", "Score"];
      const csvRows = safeRows.map((row) => {
        const sdg = row.sdg_number || "";
        const dimension = row.sustainability_dimension || "";
        const question = (row.question || "").replace(/"/g, '""');
        const score = row.score !== undefined ? row.score : "";
        return [`"${sdg}"`, `"${dimension}"`, `"${question}"`, `"${score}"`].join(",");
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
      // Clone the SVG
      const svgElement = ref.current.cloneNode(true) as SVGSVGElement;
      const images = svgElement.querySelectorAll("image");

      // Convert all images to base64
      const imagePromises = Array.from(images).map(async (imgEl) => {
        const href = imgEl.getAttribute("href");
        if (!href || href.startsWith("data:")) return;

        try {
          // Load the image
          const img = new Image();
          img.crossOrigin = "anonymous";
          
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              try {
                // Convert to base64
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth || 148;
                canvas.height = img.naturalHeight || 148;
                const ctx = canvas.getContext("2d");
                
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  const dataUrl = canvas.toDataURL("image/png");
                  imgEl.setAttribute("href", dataUrl);
                }
                resolve();
              } catch (e) {
                console.warn("Failed to convert image:", href, e);
                resolve(); // Continue even if one fails
              }
            };
            
            img.onerror = () => {
              console.warn("Failed to load image:", href);
              resolve(); // Continue even if one fails
            };
            
            img.src = href;
          });
        } catch (err) {
          console.warn("Error processing image:", href, err);
        }
      });

      // Wait for all images to be converted
      await Promise.all(imagePromises);

      // Now serialize the SVG with base64 images
      const svgData = new XMLSerializer().serializeToString(svgElement);
      
      const canvas = document.createElement("canvas");
      const scale = 2; // Higher resolution
      canvas.width = (size.w || 1000) * scale;
      canvas.height = (size.h || 1000) * scale;
      
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
        ctx.scale(scale, scale);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size.w || 1000, size.h || 1000);
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
          link.href = downloadUrl;
          link.download = filename;
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
        alert("Download failed. Please try again or contact support.");
        setIsDownloading(false);
      };

      img.src = url;
    } catch (error) {
      console.error("Chart download error:", error);
      alert("Download failed. Please try again or contact support.");
      setIsDownloading(false);
    }
  };

  const handleDownloadRadarCharts = async (radarIndex?: number) => {
    const radarNames = ["Economic", "Social", "Environmental", "Circular"];
    const indicesToDownload = radarIndex !== undefined ? [radarIndex] : [0, 1, 2, 3];

    setIsDownloadingRadar(true);
    setShowRadarDownloadMenu(false);

    try {
      for (const i of indicesToDownload) {
        const radarRef = radarRefs[i];
        const radarName = radarNames[i];

        if (!radarRef.current) continue;

        const svgElement = radarRef.current.cloneNode(true) as SVGSVGElement;
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) continue;

        const img = new Image();
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            canvas.width = radarSize.w || 400;
            canvas.height = radarSize.h || 400;

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);

            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error("Failed to generate image"));
                return;
              }

              const link = document.createElement("a");
              const timestamp = new Date().toISOString().split("T")[0];
              const filename = `${radarName}_Dimension_Radar_${sector}_${timestamp}.png`;

              const downloadUrl = URL.createObjectURL(blob);
              link.setAttribute("href", downloadUrl);
              link.setAttribute("download", filename);
              link.style.visibility = "hidden";

              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(downloadUrl);

              console.log(`✅ Downloaded: ${filename}`);
              resolve();
            }, "image/png");
          };

          img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load radar chart"));
          };

          img.src = url;
        });

        if (indicesToDownload.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      setIsDownloadingRadar(false);
    } catch (error) {
      console.error("Radar charts download error:", error);
      alert("Failed to download radar charts. Please try again.");
      setIsDownloadingRadar(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={handleDownloadCSV}
              disabled={!safeRows || safeRows.length === 0}
              className={`px-4 py-2 bg-green-600 text-white rounded-lg transition flex items-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                !safeRows || safeRows.length === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-green-700"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Score
            </button>
          </div>

          <div ref={cardRef}>
            <svg ref={ref} width={size.w || "100%"} height={size.h || 800} style={{ display: "block", margin: "0 auto" }} />
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleDownloadChart}
              disabled={!size.w || isDownloading}
              className={`px-4 py-2 bg-green-600 text-white rounded-lg transition flex items-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                !size.w || isDownloading ? "opacity-50 cursor-not-allowed" : "hover:bg-green-700"
              }`}
            >
              {isDownloading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        <div className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Dimension Performance Radars</h2>
          <div ref={radarContainerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {DIMENSIONS.map((dim, index) => (
              <div key={dim.key} className="flex flex-col items-center">
                <div 
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedRadar(index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedRadar(index);
                    }
                  }}
                >
                  <svg ref={radarRefs[index]} width={radarSize.w || 250} height={radarSize.h || 250} style={{ display: "block" }} />
                </div>
                <p className="text-sm font-semibold mt-2" style={{ color: dim.color }}>{dim.shortKey}</p>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end mt-6">
            <div className="relative">
              <button
                onClick={() => setShowRadarDownloadMenu(!showRadarDownloadMenu)}
                disabled={!radarSize.w || isDownloadingRadar}
                className={`px-4 py-2 bg-green-600 text-white rounded-lg transition flex items-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                  !radarSize.w || isDownloadingRadar ? "opacity-50 cursor-not-allowed" : "hover:bg-green-700"
                }`}
              >
                {isDownloadingRadar ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Download Charts
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>

              {showRadarDownloadMenu && !isDownloadingRadar && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                  <div className="py-1">
                    <button onClick={() => handleDownloadRadarCharts()} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                      Download All Charts
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    {DIMENSIONS.map((dim, index) => (
                      <button key={dim.key} onClick={() => handleDownloadRadarCharts(index)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dim.color }}></div>
                        {dim.shortKey} Chart
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showRadarDownloadMenu && (
          <div className="fixed inset-0 z-0" onClick={() => setShowRadarDownloadMenu(false)}></div>
        )}

        {selectedRadar !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setSelectedRadar(null)}>
            <div className="bg-white rounded-xl p-6 max-w-3xl w-full relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelectedRadar(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-full p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-2xl font-bold mb-4 text-center" style={{ color: DIMENSIONS[selectedRadar].color }}>
                {DIMENSIONS[selectedRadar].shortKey} Performance
              </h3>
              <div className="flex justify-center">
                <EnlargedRadar cells={cells} dimension={DIMENSIONS[selectedRadar]} />
              </div>
            </div>
          </div>
        )}

        <section className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Performance Summary</h2>

          <div className="mb-8">
            <h3 className="font-semibold mb-4 text-gray-800 text-lg flex items-center gap-2">
              By <Tooltip text={TOOLTIPS.SDG}>Dimension</Tooltip>
            </h3>
            <div className="flex flex-col gap-4">
              {DIMENSIONS.map((d) => {
                const score = dimensionTotals[d.key];
                const percentage = Math.round((score / 85) * 100);
                return (
                  <div key={d.key} className="rounded-lg p-4 bg-gradient-to-r from-green-50 to-white shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow" style={{ backgroundColor: d.color }}>
                        {d.number}
                      </div>
                      <Tooltip text={TOOLTIPS[d.shortKey]}>
                        <span className="font-medium text-sm text-gray-800">{d.shortKey}</span>
                      </Tooltip>
                    </div>
                    <div className="flex justify-between text-xs mb-1 text-gray-600">
                      <Tooltip text={TOOLTIPS.Score}>
                        <span>Score: {score}/85</span>
                      </Tooltip>
                      <span className="font-bold text-gray-700">{percentage}%</span>
                    </div>
                    <div className="w-full bg-green-100 rounded-full h-2 overflow-hidden">
                      <div className="rounded-full h-2 transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: d.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-gray-800 text-lg flex items-center gap-2">
              By <Tooltip text={TOOLTIPS.SDG}>SDG</Tooltip>
            </h3>

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-green-700 mb-3">Best Performing</h4>
              <div className="flex flex-col gap-3">
                {topSDGs.map((sdg) => {
                  const percentage = Math.round((sdg.score / 20) * 100);
                  return (
                    <div key={sdg.sdg} className="rounded-lg p-3 bg-gradient-to-r from-green-50 to-white shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <img src={SDG_IMAGE_MAP[sdg.sdg]} alt={`SDG ${sdg.sdg}: ${sdg.description}`} className="w-10 h-10 rounded" />
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-gray-800">SDG {sdg.sdg}: {sdg.description}</div>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs mb-1 text-gray-600">
                        <span>Score: {sdg.score}/20</span>
                        <span className="font-bold text-green-700">{percentage}%</span>
                      </div>
                      <div className="w-full bg-green-100 rounded-full h-2 overflow-hidden">
                        <div className="rounded-full h-2 transition-all duration-500 bg-green-600" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-red-700 mb-3">Lowest Performing</h4>
              <div className="flex flex-col gap-3">
                {bottomSDGs.map((sdg) => {
                  const percentage = Math.round((sdg.score / 20) * 100);
                  return (
                    <div key={sdg.sdg} className="rounded-lg p-3 bg-gradient-to-r from-red-50 to-white shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <img src={SDG_IMAGE_MAP[sdg.sdg]} alt={`SDG ${sdg.sdg}: ${sdg.description}`} className="w-10 h-10 rounded" />
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-gray-800">SDG {sdg.sdg}: {sdg.description}</div>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs mb-1 text-gray-600">
                        <span>Score: {sdg.score}/20</span>
                        <span className="font-bold text-red-700">{percentage}%</span>
                      </div>
                      <div className="w-full bg-green-100 rounded-full h-2 overflow-hidden">
                        <div className="rounded-full h-2 transition-all duration-500 bg-red-600" style={{ width: `${percentage}%` }} />
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