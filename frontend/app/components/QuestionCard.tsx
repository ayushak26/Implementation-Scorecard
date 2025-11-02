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
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b bg-amber-50 flex items-center gap-4">
        <div className="flex-1">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">
            SDG {sdg.sdg_number}: {sdg.sdg_description}
          </h3>
        </div>
        <img
          src={SDG_IMAGE_MAP[sdg.sdg_number]}
          alt={`SDG ${sdg.sdg_number} Icon`}
          className="w-[308px] h-[308px] object-contain mx-auto"
          loading="lazy"
        />
      </div>

      {/* 4 questions stacked in separate cards */}
      <div className="p-6 space-y-6">
        {questions.map((q, idx) => {
          const ckey = makeKey(q);
          const selected = selectedScores[ckey];
          const groupName = `g-${ckey}`;

          return (
            <div
              key={ckey}
              className="bg-gray-50 rounded-lg p-5 border border-gray-200"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded bg-neutral-800 text-white flex items-center justify-center text-sm font-semibold">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">Dimension:</span>{" "}
                    <span className="text-gray-900">{q.sustainability_dimension}</span>
                  </p>
                  <p className="text-sm mt-1">
                    <span className="font-semibold">Question:</span>{" "}
                    <span className="text-gray-900">{q.question}</span>
                  </p>
                  <span className="text-red-500 text-base leading-none mt-1 inline-block">
                    *
                  </span>
                </div>
              </div>

              <fieldset className="pl-11">
                <legend className="sr-only">
                  Score for {q.sustainability_dimension} (SDG {q.sdg_number})
                </legend>
                <div className="flex flex-col gap-3">
                  {scores.map((score) => {
                    const desc = scoreRubric[score as 0 | 1 | 2 | 3 | 4 | 5] ?? "";
                    const isChecked = selected === score;
                    return (
                      <label
                        key={score}
                        className="flex items-start gap-3 cursor-pointer select-none"
                        title={desc}
                      >
                        <input
                          type="radio"
                          name={groupName}
                          value={score}
                          checked={isChecked}
                          onChange={(e) => onScoreSelect(ckey, Number(e.target.value))}
                          className="mt-1 h-4 w-4 text-primary focus:ring-primary"
                          aria-label={`Score ${score}: ${desc}`}
                          required
                        />
                        <span className="text-gray-800">{desc}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          );
        })}
      </div>
    </div>
  );
}