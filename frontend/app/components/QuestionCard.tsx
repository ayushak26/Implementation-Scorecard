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
    <div className="bg-white rounded-xl shadow-sm border">
      {/* Header */}
      <div className="px-6 py-5 border-b bg-amber-50 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-black text-white flex items-center justify-center text-sm font-semibold">
          {sdg.sdg_number}
        </div>
        <div className="flex-1">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">
            SDG {sdg.sdg_number}: {sdg.sdg_description}
          </h3>
          {sdg.sdg_target ? (
            <p className="text-xs text-gray-600 mt-1">Target: {sdg.sdg_target}</p>
          ) : null}
        </div>
      </div>

      {/* 4 questions stacked */}
      <div className="p-6 space-y-6">
        {questions.map((q, idx) => {
          const ckey = makeKey(q);
          const selected = selectedScores[ckey];
          const groupName = `g-${ckey}`; // unique -> radios never clash

          return (
            <div key={ckey} className="bg-white">
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
                  <span className="text-red-500 text-base leading-none mt-1 inline-block">*</span>
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
                      <label key={score} className="flex items-start gap-3 cursor-pointer select-none" title={desc}>
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
