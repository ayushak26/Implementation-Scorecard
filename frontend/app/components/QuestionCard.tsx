// app/components/QuestionCard.tsx
import React from "react";

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

type Props = {
  /** Exactly 4 questions (one per dimension) for a single SDG card */
  questions: Question[];
  /** Map of compositeKey -> selected score */
  selectedScores: Record<string, number | undefined>;
  /** Called when a score changes for a specific compositeKey */
  onScoreSelect: (compositeKey: string, score: number) => void;
  /** Optional: 0..5 -> description */
  scoreRubric?: Record<number, string>;
};

const DEFAULT_RUBRIC: Record<number, string> = {
  0: "N/A",
  1: "Issue identified, but no plans for further actions",
  2: "Issue identified, starts planning further actions",
  3: "Action plan with clear targets and deadlines in place",
  4: "Action plan operational - some progress in established targets",
  5: "Action plan operational - achieving the target set",
};

const norm = (s: string) => (s || "").trim().toLowerCase();
const makeKey = (q: Question) => `${norm(q.sector)}|${q.sdg_number}|${norm(q.sustainability_dimension)}`;

// === SDG IMAGE MAP (1 to 17) ===
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

// Dimension color mapping
const DIMENSION_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  economic: { bg: "bg-blue-50", text: "text-blue-800", badge: "bg-blue-100" },
  social: { bg: "bg-yellow-50", text: "text-yellow-800", badge: "bg-yellow-100" },
  environmental: { bg: "bg-green-50", text: "text-green-800", badge: "bg-green-100" },
  circular: { bg: "bg-orange-50", text: "text-orange-800", badge: "bg-orange-100" },
  circularity: { bg: "bg-orange-50", text: "text-orange-800", badge: "bg-orange-100" },
};

const getDimensionColor = (dimension: string) => {
  const key = dimension.toLowerCase();
  return DIMENSION_COLORS[key] || { bg: "bg-gray-50", text: "text-gray-800", badge: "bg-gray-100" };
};

export default function QuestionCard({
  questions,
  selectedScores,
  onScoreSelect,
  scoreRubric = DEFAULT_RUBRIC,
}: Props) {
  if (!questions || questions.length === 0) return null;

  const sdg = questions[0];
  const scores = [0, 1, 2, 3, 4, 5];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-green-200 overflow-hidden">
      {/* Header - Light green theme inspired by BIORADAR */}
      <div className="px-8 py-6 bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-b-2 border-green-200 flex items-center gap-6">
        <div className="flex-1">
          <div className="inline-block px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full mb-2 shadow-sm">
            SDG {sdg.sdg_number}
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
            {sdg.sdg_description}
          </h3>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-green-400 opacity-20 blur-xl rounded-full"></div>
          <img
            src={SDG_IMAGE_MAP[sdg.sdg_number]}
            alt={`SDG ${sdg.sdg_number} Icon`}
            className="relative w-28 h-28 object-contain drop-shadow-lg"
            loading="lazy"
          />
        </div>
      </div>

      {/* Matrix Table */}
      <div className="p-8 overflow-x-auto">
        <div className="rounded-xl overflow-hidden shadow-md border border-green-100">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-green-700 to-emerald-700">
                <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider w-[40%]">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Question
                  </div>
                </th>
                {scores.map((score) => (
                  <th
                    key={score}
                    className="px-3 py-4 text-center w-[10%]"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white text-gray-900 font-bold shadow-md text-sm">
                        {score}
                      </div>
                      <div className="text-xs text-white font-normal leading-tight px-1">
                        {scoreRubric[score as 0 | 1 | 2 | 3 | 4 | 5]}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-green-100">
              {questions.map((q, idx) => {
                const ckey = makeKey(q);
                const selected = selectedScores[ckey];
                const groupName = `g-${ckey}`;
                const colors = getDimensionColor(q.sustainability_dimension);

                return (
                  <tr 
                    key={ckey} 
                    className={`
                      transition-all duration-200 hover:bg-green-50
                      ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    `}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-emerald-700 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className={`inline-block px-3 py-1 ${colors.badge} ${colors.text} text-xs font-semibold rounded-full mb-2`}>
                            {q.sustainability_dimension}
                          </div>
                          <p className="text-sm text-gray-800 leading-relaxed">
                            {q.question}
                          </p>
                          <span className="text-red-500 text-lg font-bold leading-none mt-1 inline-block">
                            *
                          </span>
                        </div>
                      </div>
                    </td>
                    {scores.map((score) => {
                      const isChecked = selected === score;
                      return (
                        <td
                          key={score}
                          className="px-3 py-5 text-center"
                        >
                          <label className={`
                            flex items-center justify-center cursor-pointer
                            transition-all duration-200
                            ${isChecked ? 'scale-110' : 'hover:scale-105'}
                          `}>
                            <input
                              type="radio"
                              name={groupName}
                              value={score}
                              checked={isChecked}
                              onChange={(e) => onScoreSelect(ckey, Number(e.target.value))}
                              className="h-6 w-6 text-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 cursor-pointer transition-transform accent-green-600"
                              aria-label={`${q.sustainability_dimension} - Score ${score}`}
                              required
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend Footer - Light green theme */}
      <div className="px-8 py-5 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-sm font-bold">
            !
          </div>
          <p className="text-sm text-gray-800 font-medium">
            <span className="text-red-600 font-bold text-lg">*</span> All questions are mandatory — Please complete all fields before proceeding
          </p>
        </div>
      </div>
    </div>
  );
}