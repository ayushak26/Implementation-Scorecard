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
  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const score = Number(e.target.value); // Explicit type casting
    onScoreSelect(score);
  };

  return (
    <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-primary">
        SDG {question.sdg_number}: {question.sdg_description}
      </h3>
      <p className="text-neutral text-sm mt-2">Target: {question.sdg_target}</p>
      <p className="text-neutral text-sm">Dimension: {question.sustainability_dimension}</p>
      <p className="text-neutral text-sm">KPI: {question.kpi}</p>
      <p className="text-gray-600 mt-4">{question.question}</p>
      <div className="mt-4">
        <label htmlFor="score-slider" className="text-sm text-gray-600">
          Score (0-5):
        </label>
        <input
          id="score-slider"
          type="range"
          min="0"
          max="5"
          value={selectedScore ?? 0}
          onChange={handleScoreChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          aria-label="Select a score from 0 to 5"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={selectedScore ?? 0}
        />
        <div className="flex justify-between text-sm text-neutral mt-2">
          <span>0</span>
          <span>{selectedScore ?? 0}</span>
          <span>5</span>
        </div>
      </div>
    </div>
  );
}