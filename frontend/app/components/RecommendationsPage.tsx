// app/components/RecommendationsPage.tsx
"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";

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
  recommendations?: {
    awareness?: { text?: string; source?: string };
    developing?: { text?: string; source?: string };
    leading?: { text?: string; source?: string };
  };
};

type Props = {
  rows: QuestionnaireRow[];
  sector: string;
};

// SDG Names
const SDG_NAMES: Record<number, string> = {
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

// Dimensions
const DIMENSIONS = [
  { key: "Economic Performance", color: "#3B82F6", shortKey: "Economic" },
  { key: "Circular Performance", color: "#F97316", shortKey: "Circular" },
  { key: "Environmental Performance", color: "#22C55E", shortKey: "Environmental" },
  { key: "Social Performance", color: "#EAB308", shortKey: "Social" },
] as const;

// Maturity level styling - Red, Yellow, Green
const MATURITY_STYLES = {
  awareness: {
    bg: "bg-red-50",
    text: "text-red-800",
    badge: "bg-red-100 text-red-800",
    icon: "🔴",
    label: "Awareness"
  },
  developing: {
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    badge: "bg-yellow-100 text-yellow-800",
    icon: "🟡",
    label: "Developing"
  },
  leading: {
    bg: "bg-green-50",
    text: "text-green-800",
    badge: "bg-green-100 text-green-800",
    icon: "🟢",
    label: "Leading"
  }
};

// Helper to get maturity level from score
const getMaturityLevel = (score: number): keyof typeof MATURITY_STYLES => {
  if (score < 2) return "awareness";
  if (score < 4) return "developing";
  return "leading";
};

// Helper function to normalize dimension names
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

export default function RecommendationsPage({ rows, sector }: Props) {
  const router = useRouter();

  // Group by SDG, with all dimensions and their recommendations
  const sdgData = useMemo(() => {
    const sdgMap: Record<number, {
      dimensions: Record<string, {
        score: number;
        count: number;
        maturityLevel: string;
        recommendations: QuestionnaireRow['recommendations'];
        color: string;
      }>;
      totalScore: number;
      totalCount: number;
    }> = {};

    rows.forEach((row) => {
      const sdg = Number(row.sdg_number);
      const score = Number(row.score);
      const dim = canonicalDim(row.sustainability_dimension);

      if (sdg && !isNaN(score) && dim) {
        if (!sdgMap[sdg]) {
          sdgMap[sdg] = {
            dimensions: {},
            totalScore: 0,
            totalCount: 0
          };
        }

        if (!sdgMap[sdg].dimensions[dim]) {
          const dimColor = DIMENSIONS.find(d => d.key === dim)?.color || "#000";
          sdgMap[sdg].dimensions[dim] = {
            score: 0,
            count: 0,
            maturityLevel: "awareness",
            recommendations: {},
            color: dimColor
          };
        }

        sdgMap[sdg].dimensions[dim].score += score;
        sdgMap[sdg].dimensions[dim].count += 1;
        sdgMap[sdg].totalScore += score;
        sdgMap[sdg].totalCount += 1;

        // Keep first non-empty recommendations for this dimension
        if (row.recommendations && Object.keys(row.recommendations).length > 0 && 
            Object.keys(sdgMap[sdg].dimensions[dim].recommendations || {}).length === 0) {
          sdgMap[sdg].dimensions[dim].recommendations = row.recommendations;
        }
      }
    });

    // Calculate averages and maturity levels
    Object.keys(sdgMap).forEach(sdg => {
      Object.keys(sdgMap[Number(sdg)].dimensions).forEach(dim => {
        const dimData = sdgMap[Number(sdg)].dimensions[dim];
        const avgScore = dimData.count > 0 ? dimData.score / dimData.count : 0;
        dimData.score = avgScore;
        dimData.maturityLevel = getMaturityLevel(avgScore);
      });
    });

    // Convert to array and sort by average SDG score (lowest first)
    return Object.entries(sdgMap)
      .map(([sdg, data]) => ({
        sdg: Number(sdg),
        sdgDescription: SDG_NAMES[Number(sdg)],
        avgScore: data.totalCount > 0 ? data.totalScore / data.totalCount : 0,
        maturityLevel: getMaturityLevel(data.totalCount > 0 ? data.totalScore / data.totalCount : 0),
        dimensions: data.dimensions
      }))
      .sort((a, b) => a.avgScore - b.avgScore);
  }, [rows]);

  // Calculate dimension averages for summary
  const dimensionAverages = useMemo(() => {
    const dimScores: Record<string, { sum: number; count: number }> = {};

    DIMENSIONS.forEach((d) => {
      dimScores[d.key] = { sum: 0, count: 0 };
    });

    rows.forEach((row) => {
      const score = Number(row.score);
      const dim = canonicalDim(row.sustainability_dimension);

      if (!isNaN(score) && dim) {
        dimScores[dim].sum += score;
        dimScores[dim].count += 1;
      }
    });

    return DIMENSIONS.map((d) => ({
      dimension: d.key,
      color: d.color,
      shortKey: d.shortKey,
      avgScore: dimScores[d.key].count > 0 ? dimScores[d.key].sum / dimScores[d.key].count : 0,
      maturityLevel: getMaturityLevel(dimScores[d.key].count > 0 ? dimScores[d.key].sum / dimScores[d.key].count : 0)
    }));
  }, [rows]);

  return (
    <div className="w-full flex justify-center bg-gray-50 min-h-screen py-6 sm:py-8 md:py-12 px-4 sm:px-6 md:px-8">
      <div className="w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl transition-all duration-300 bg-white rounded-2xl shadow-lg p-6 sm:p-8 md:p-10 mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <img
              src="https://www.bioradar.org/themes/custom/b5subtheme/logo.svg"
              alt="BIORADAR Logo"
              className="h-20 sm:h-24 object-contain"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 text-center">
            Sustainability Recommendations
          </h1>
          <p className="text-gray-600 text-center">
            Sector: <span className="font-semibold">{sector}</span>
          </p>
        </div>

        {/* Dimension Summary Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Performance by Dimension
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {dimensionAverages.map((dim) => {
              const maturityStyle = MATURITY_STYLES[dim.maturityLevel];
              return (
                <div
                  key={dim.dimension}
                  className={`${maturityStyle.bg} rounded-xl p-5 transition-shadow hover:shadow-lg`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg" style={{ color: dim.color }}>
                      {dim.shortKey}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{maturityStyle.icon}</span>
                      <span className="text-2xl font-bold" style={{ color: dim.color }}>
                        {dim.avgScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-white rounded-full h-3 mb-2">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${(dim.avgScore / 5) * 100}%`,
                        backgroundColor: dim.color,
                      }}
                    />
                  </div>
                  <span className={`inline-block px-3 py-1 ${maturityStyle.badge} rounded-full text-xs font-semibold`}>
                    {maturityStyle.icon} {maturityStyle.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommendations by SDG */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Recommendations by SDG
          </h2>
          
          <div className="space-y-6">
            {sdgData.map((sdgItem) => {
              const sdgMaturityStyle = MATURITY_STYLES[sdgItem.maturityLevel as keyof typeof MATURITY_STYLES];

              return (
                <div
                  key={sdgItem.sdg}
                  className={`${sdgMaturityStyle.bg} rounded-xl p-6 transition-shadow hover:shadow-lg`}
                >
                  {/* SDG Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{sdgMaturityStyle.icon}</span>
                        <h3 className="text-xl font-bold text-gray-900">
                          SDG {sdgItem.sdg}: {sdgItem.sdgDescription}
                        </h3>
                      </div>
                      <span className={`inline-block px-3 py-1 ${sdgMaturityStyle.badge} rounded-full text-xs font-semibold`}>
                        {sdgMaturityStyle.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {sdgItem.avgScore.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-600">/ 5.0</div>
                    </div>
                  </div>

                  {/* Dimensions and their recommendations */}
                  <div className="space-y-4">
                    {DIMENSIONS.map((dimension) => {
                      const dimData = sdgItem.dimensions[dimension.key];
                      if (!dimData) return null;

                      const dimMaturityLevel = getMaturityLevel(dimData.score);
                      const recommendation = dimData.recommendations?.[dimMaturityLevel as keyof typeof dimData.recommendations];

                      if (!recommendation || !recommendation.text) return null;

                      return (
                        <div
                          key={dimension.key}
                          className="bg-white rounded-lg p-4"
                        >
                          {/* Dimension Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: dimension.color }}
                              />
                              <h4 className="font-semibold text-gray-900">
                                {dimension.shortKey}
                              </h4>
                              <span className="text-sm text-gray-600">
                                {dimData.score.toFixed(1)} / 5.0
                              </span>
                            </div>
                          </div>

                          {/* Recommendation */}
                          <div>
                            <h5 className="font-medium text-gray-700 text-sm mb-2">
                              Recommendations
                            </h5>
                            <p className="text-gray-800 text-sm leading-relaxed mb-2">
                              {recommendation.text}
                            </p>
                            {recommendation.source && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs text-gray-600 font-medium mb-1">📚 Sources:</p>
                                <p className="text-xs text-gray-600 italic">
                                  {recommendation.source}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gray-200">
          <button
            onClick={() => router.push("/visualization")}
            className="px-6 py-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200 font-medium"
          >
            ← Back to Visualization
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:opacity-90 transition-opacity duration-200"
          >
            📄 Download Report
          </button>
        </div>
      </div>
    </div>
  );
}