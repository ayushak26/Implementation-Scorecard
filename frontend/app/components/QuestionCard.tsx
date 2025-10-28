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
      <div className="px-6 py-5 border-b bg-amber-50 flex items-center gap-4">
        <img
          src={SDG_IMAGE_MAP[sdg.sdg_number]}
          alt={`SDG ${sdg.sdg_number} Icon`}
          className="w-12 h-12 object-contain"
          loading="lazy"
        />
        <div className="flex-1">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">
            SDG {sdg.sdg_number}: {sdg.sdg_description}
          </h3>
          {sdg.sdg_target ? (
            <p className="text-xs text-gray-600 mt-1">Target: {sdg.sdg_target}</p>
          ) : null}
        </div>
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