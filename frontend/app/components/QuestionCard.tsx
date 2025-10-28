// app/components/QuestionCard.tsx
import React from "react";

interface Question {
  id: string;
  question: string;
  sdg_description: string;
}

interface QuestionCardProps {
  question: Question;
  selectedScore: number;
  onScoreSelect: (score: number) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, selectedScore, onScoreSelect }) => {
  const handleScoreChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const score = parseInt(event.target.value, 10);
    onScoreSelect(score);
  };

  return (
    <div className="border rounded-lg p-4 shadow-md">
      <h2 className="text-lg font-bold">{question.question}</h2>
      <p className="text-sm text-gray-600">SDG: {question.sdg_description}</p>
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Score:
        </label>
        <div className="flex gap-2 flex-wrap">
          {[0, 1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              onClick={() => onScoreSelect(score)}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedScore === score
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {score}
            </button>
          ))}
        </div>
        <div className="mt-2 text-sm text-gray-500">
          {selectedScore === 0 && "N/A"}
          {selectedScore === 1 && "Issue identified, but no plans for further actions"}
          {selectedScore === 2 && "Issue identified, starts planning further actions"}
          {selectedScore === 3 && "Action plan with clear targets and deadlines in place"}
          {selectedScore === 4 && "Action plan operational - some progress in established targets"}
          {selectedScore === 5 && "Action plan operational - achieving the target set"}
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;