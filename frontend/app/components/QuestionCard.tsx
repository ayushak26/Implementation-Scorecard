// app/components/QuestionCard.tsx
import React from "react";

type Question = {
  sdg_number: number;
  sdg_description: string;
  sdg_target: string;
  sustainability_dimension: string;
  kpi: string;
  question: string;
};

type Props = {
  question: Question;
  selectedScore?: number;
  onScoreSelect: (score: number) => void;
};

export default function QuestionCard({ question, selectedScore, onScoreSelect }: Props) {
  const scores = [0, 1, 2, 3, 4, 5]; // Score range based on FormPage logic

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const score = Number(e.target.value); // Explicit type casting
    onScoreSelect(score);
  };

  return (
    <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary">
        SDG {question.sdg_number}: {question.sdg_description}
      </h3>
      <p className="text-neutral text-sm mt-2">Target: {question.sdg_target || "N/A"}</p>
      <p className="text-neutral text-sm">Dimension: {question.sustainability_dimension}</p>
      <p className="text-neutral text-sm">KPI: {question.kpi || "N/A"}</p>
      <p className="text-gray-600 mt-4">{question.question}</p>
      <div className="mt-4">
        <label className="text-sm text-gray-600">Score (0-5):</label>
        <div className="flex flex-wrap gap-3 mt-2">
          {scores.map((score) => (
            <label
              key={score}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all duration-300
                ${selectedScore === score ? "opacity-30" : "opacity-100"}
                ${selectedScore === score ? "bg-primary/10" : "bg-white"}
                hover:bg-gray-100`}
            >
              <input
                type="radio"
                name={`question-${question.sdg_number}-${question.sustainability_dimension}`}
                value={score}
                checked={selectedScore === score}
                onChange={handleScoreChange}
                className="h-4 w-4 text-primary focus:ring-primary"
                aria-label={`Score ${score}`}
              />
              <span className="text-gray-700">{score}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}