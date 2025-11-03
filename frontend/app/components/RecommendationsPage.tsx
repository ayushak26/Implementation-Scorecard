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
  { key: "Economic Performance", color: "#FFB800", shortKey: "Economic" },
  { key: "Circular Performance", color: "#9B59B6", shortKey: "Circular" },
  { key: "Environmental Performance", color: "#27AE60", shortKey: "Environmental" },
  { key: "Social Performance", color: "#3498DB", shortKey: "Social" },
] as const;

// Performance Level Definitions
type PerformanceLevel = {
  level: string;
  color: string;
  bgColor: string;
  icon: string;
  message: string;
};

const getPerformanceLevel = (avgScore: number): PerformanceLevel => {
  if (avgScore < 2) {
    return {
      level: "Critical - Immediate Action Required",
      color: "#DC2626",
      bgColor: "#FEE2E2",
      icon: "🚨",
      message: "Significant gaps identified. Immediate strategic intervention needed.",
    };
  } else if (avgScore < 3) {
    return {
      level: "Needs Improvement",
      color: "#EA580C",
      bgColor: "#FFEDD5",
      icon: "⚠️",
      message: "Basic practices in place, but substantial improvements required.",
    };
  } else if (avgScore < 4) {
    return {
      level: "Developing",
      color: "#F59E0B",
      bgColor: "#FEF3C7",
      icon: "📊",
      message: "Good foundation established. Continue building and monitoring.",
    };
  } else if (avgScore < 4.5) {
    return {
      level: "Strong Performance",
      color: "#10B981",
      bgColor: "#D1FAE5",
      icon: "✅",
      message: "Excellent practices in place. Focus on optimization and innovation.",
    };
  } else {
    return {
      level: "Leading Excellence",
      color: "#059669",
      bgColor: "#A7F3D0",
      icon: "🏆",
      message: "Industry-leading performance. Share best practices and maintain momentum.",
    };
  }
};

// Sector-specific recommendations
const getSectorRecommendations = (
  sector: string,
  sdg: number,
  avgScore: number,
  dimension: string
): string[] => {
  const recommendations: string[] = [];

  // Critical/Low Score Recommendations
  if (avgScore < 2) {
    if (sector === "Textiles") {
      if (dimension === "Environmental Performance") {
        recommendations.push(
          "Implement water recycling systems to reduce freshwater consumption by at least 30%",
          "Conduct comprehensive chemical inventory and phase out hazardous substances",
          "Establish baseline carbon footprint and set science-based reduction targets"
        );
      } else if (dimension === "Social Performance") {
        recommendations.push(
          "Develop worker safety training programs and emergency response protocols",
          "Implement fair wage policies aligned with living wage benchmarks",
          "Establish grievance mechanisms and worker representation systems"
        );
      } else if (dimension === "Circular Performance") {
        recommendations.push(
          "Launch textile waste collection and sorting infrastructure",
          "Partner with recycling facilities to establish closed-loop systems",
          "Design products with end-of-life recyclability in mind"
        );
      } else if (dimension === "Economic Performance") {
        recommendations.push(
          "Diversify supplier base to reduce dependency risks",
          "Invest in energy efficiency to reduce operational costs",
          "Develop long-term sustainability business case with ROI analysis"
        );
      }
    } else if (sector === "Fertilizers") {
      if (dimension === "Environmental Performance") {
        recommendations.push(
          "Implement nutrient runoff monitoring and mitigation systems",
          "Transition to precision agriculture techniques to minimize environmental impact",
          "Establish emission reduction targets for production facilities"
        );
      } else if (dimension === "Social Performance") {
        recommendations.push(
          "Develop comprehensive health and safety management system",
          "Provide farmer education programs on safe application practices",
          "Establish community engagement mechanisms for addressing concerns"
        );
      } else if (dimension === "Circular Performance") {
        recommendations.push(
          "Implement packaging take-back and reuse programs",
          "Explore bio-based and biodegradable packaging alternatives",
          "Partner with farmers for organic waste valorization"
        );
      } else if (dimension === "Economic Performance") {
        recommendations.push(
          "Optimize production efficiency to reduce input costs",
          "Develop sustainable product lines to access premium markets",
          "Invest in R&D for next-generation sustainable fertilizers"
        );
      }
    } else if (sector === "Packaging") {
      if (dimension === "Environmental Performance") {
        recommendations.push(
          "Conduct life cycle assessments for all product lines",
          "Set targets for renewable energy use in manufacturing",
          "Implement carbon accounting across value chain"
        );
      } else if (dimension === "Social Performance") {
        recommendations.push(
          "Establish workplace safety standards aligned with ISO 45001",
          "Implement diversity and inclusion programs",
          "Develop supplier code of conduct with monitoring mechanisms"
        );
      } else if (dimension === "Circular Performance") {
        recommendations.push(
          "Design for recyclability - target 100% recyclable materials",
          "Establish take-back schemes and collection infrastructure",
          "Partner with waste management facilities to improve recycling rates"
        );
      } else if (dimension === "Economic Performance") {
        recommendations.push(
          "Invest in lightweighting to reduce material costs",
          "Develop innovative sustainable packaging solutions",
          "Build business case for circular economy transition"
        );
      }
    }
  }
  // Moderate Score Recommendations (2-3)
  else if (avgScore < 3) {
    if (sector === "Textiles") {
      if (dimension === "Environmental Performance") {
        recommendations.push(
          "Scale up renewable energy procurement to 50% of total consumption",
          "Implement advanced wastewater treatment technologies",
          "Expand sustainable material sourcing to 30% of inputs"
        );
      } else if (dimension === "Circular Performance") {
        recommendations.push(
          "Increase post-consumer textile collection to 25% of sales volume",
          "Develop product-as-a-service or rental models",
          "Invest in fiber-to-fiber recycling technologies"
        );
      }
    } else if (sector === "Fertilizers") {
      if (dimension === "Environmental Performance") {
        recommendations.push(
          "Expand precision agriculture advisory services to customers",
          "Invest in controlled-release fertilizer technologies",
          "Develop carbon-neutral production roadmap"
        );
      }
    } else if (sector === "Packaging") {
      if (dimension === "Circular Performance") {
        recommendations.push(
          "Increase recycled content to 50% across product portfolio",
          "Innovate with compostable packaging for appropriate applications",
          "Collaborate with brands on reuse and refill systems"
        );
      }
    }
  }
  // Good Score Recommendations (3-4)
  else if (avgScore < 4) {
    recommendations.push(
      "Pursue third-party certifications to validate performance",
      "Share best practices through industry associations and platforms",
      "Set ambitious stretch goals for continuous improvement",
      "Invest in digital technologies for enhanced monitoring and reporting"
    );
  }
  // Strong/Excellent Score Recommendations (4+)
  else {
    recommendations.push(
      "Lead industry initiatives and collaborate on sector-wide challenges",
      "Publish transparent sustainability reports with verified data",
      "Invest in breakthrough innovations and pilot emerging technologies",
      "Mentor other companies and share learnings through case studies"
    );
  }

  // Add general recommendations if sector-specific not available
  if (recommendations.length === 0) {
    if (avgScore < 2) {
      recommendations.push(
        "Conduct comprehensive baseline assessment and materiality analysis",
        "Develop sustainability strategy with clear goals and timelines",
        "Allocate budget and resources for sustainability initiatives",
        "Build internal capacity through training and awareness programs"
      );
    } else if (avgScore < 3) {
      recommendations.push(
        "Enhance measurement and tracking systems",
        "Engage stakeholders for feedback and collaboration",
        "Benchmark against industry peers and leaders",
        "Integrate sustainability into core business processes"
      );
    } else if (avgScore < 4) {
      recommendations.push(
        "Pursue ambitious targets aligned with science-based frameworks",
        "Expand scope of impact across value chain",
        "Innovate with new business models and technologies",
        "Strengthen governance and accountability mechanisms"
      );
    } else {
      recommendations.push(
        "Drive systems change through advocacy and partnerships",
        "Achieve net-positive impact in key areas",
        "Scale solutions through open-source approaches",
        "Influence policy and regulatory frameworks"
      );
    }
  }

  return recommendations;
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

  // Calculate average scores per SDG
  const sdgAverages = useMemo(() => {
    const sdgScores: Record<number, { sum: number; count: number; dimension: string }> = {};

    rows.forEach((row) => {
      const sdg = Number(row.sdg_number);
      const score = Number(row.score);
      const dim = canonicalDim(row.sustainability_dimension);

      if (sdg && !isNaN(score) && dim) {
        if (!sdgScores[sdg]) {
          sdgScores[sdg] = { sum: 0, count: 0, dimension: dim };
        }
        sdgScores[sdg].sum += score;
        sdgScores[sdg].count += 1;
      }
    });

    return Object.entries(sdgScores)
      .map(([sdg, data]) => ({
        sdg: Number(sdg),
        avgScore: data.count > 0 ? data.sum / data.count : 0,
        dimension: data.dimension,
      }))
      .sort((a, b) => a.sdg - b.sdg);
  }, [rows]);

  // Calculate dimension averages
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
      avgScore:
        dimScores[d.key].count > 0
          ? dimScores[d.key].sum / dimScores[d.key].count
          : 0,
    }));
  }, [rows]);

  // Calculate overall average
  const overallAverage = useMemo(() => {
    const total = dimensionAverages.reduce((sum, d) => sum + d.avgScore, 0);
    return dimensionAverages.length > 0 ? total / dimensionAverages.length : 0;
  }, [dimensionAverages]);

  const overallLevel = getPerformanceLevel(overallAverage);

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

        {/* Overall Performance */}
        <div
          className="rounded-xl p-6 mb-8"
          style={{ backgroundColor: overallLevel.bgColor }}
        >
          <div className="flex items-center gap-4 mb-4">
            <span className="text-4xl">{overallLevel.icon}</span>
            <div className="flex-1">
              <h2
                className="text-2xl font-bold mb-1"
                style={{ color: overallLevel.color }}
              >
                Overall Performance: {overallLevel.level}
              </h2>
              <p className="text-gray-700">{overallLevel.message}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: overallLevel.color }}>
                {overallAverage.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">out of 5</div>
            </div>
          </div>
        </div>

        {/* Dimension Performance */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Average Score by Dimension
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {dimensionAverages.map((dim) => {
              const level = getPerformanceLevel(dim.avgScore);
              return (
                <div
                  key={dim.dimension}
                  className="border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg" style={{ color: dim.color }}>
                      {dim.shortKey}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{level.icon}</span>
                      <span className="text-2xl font-bold" style={{ color: level.color }}>
                        {dim.avgScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${(dim.avgScore / 5) * 100}%`,
                        backgroundColor: dim.color,
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">{level.message}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* SDG-Specific Recommendations */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Detailed Recommendations by SDG
          </h2>
          <div className="space-y-6">
            {sdgAverages.map((sdgData) => {
              const level = getPerformanceLevel(sdgData.avgScore);
              const recommendations = getSectorRecommendations(
                sector,
                sdgData.sdg,
                sdgData.avgScore,
                sdgData.dimension
              );

              // Only show recommendations for SDGs that need improvement (score < 4)
              if (sdgData.avgScore >= 4) return null;

              return (
                <div
                  key={sdgData.sdg}
                  className="border-2 border-gray-200 rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{level.icon}</span>
                        <h3 className="text-xl font-bold text-gray-900">
                          SDG {sdgData.sdg}: {SDG_NAMES[sdgData.sdg]}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        Dimension: {sdgData.dimension}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-2xl font-bold"
                        style={{ color: level.color }}
                      >
                        {sdgData.avgScore.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-600">/ 5.0</div>
                    </div>
                  </div>

                  <div
                    className="rounded-lg p-4 mb-4"
                    style={{ backgroundColor: level.bgColor }}
                  >
                    <p
                      className="font-semibold text-sm"
                      style={{ color: level.color }}
                    >
                      {level.level}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">
                      Recommended Actions:
                    </h4>
                    <ul className="space-y-2">
                      {recommendations.map((rec, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-sm text-gray-700"
                        >
                          <span className="text-green-600 font-bold mt-0.5">
                            •
                          </span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Actions Summary */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🎯 Priority Actions
          </h2>
          <div className="space-y-3">
            {sdgAverages
              .filter((s) => s.avgScore < 2)
              .slice(0, 3)
              .map((sdgData) => (
                <div
                  key={sdgData.sdg}
                  className="bg-white rounded-lg p-4 border-l-4 border-red-500"
                >
                  <p className="font-semibold text-gray-900">
                    SDG {sdgData.sdg}: {SDG_NAMES[sdgData.sdg]}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Critical priority - Score: {sdgData.avgScore.toFixed(1)} / 5.0
                  </p>
                </div>
              ))}
            {sdgAverages.filter((s) => s.avgScore < 2).length === 0 && (
              <p className="text-gray-600 text-center py-4">
                ✅ No critical priority areas identified. Continue monitoring and
                improvement efforts.
              </p>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gray-200">
          <button
            onClick={() => router.push("/visualization")}
            className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
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