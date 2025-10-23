interface QuestionCardProps {
  question: {
    sdg_number: number;
    sdg_description: string;
    sdg_target: string;
    sustainability_dimension: string;
    kpi: string;
    question: string;
  };
  selectedScore?: number;
  onScoreSelect: (score: number) => void;
}

const SDG_COLORS: Record<number, string> = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
  6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
  11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B",
  16: "#00689D", 17: "#19486A",
};

const DIMENSION_COLORS: Record<string, string> = {
  Circular: "#FF9800",
  Environmental: "#4CAF50",
  Economic: "#F44336",
  Social: "#2196F3",
};

const SCORE_OPTIONS = [
  { value: 0, label: "0 - N/A", desc: "Not applicable" },
  { value: 1, label: "1 - Issue Identified", desc: "Issue identified, but no plans for further actions" },
  { value: 2, label: "2 - Planning", desc: "Issue identified, starts planning further actions" },
  { value: 3, label: "3 - Action Plan", desc: "Action plan with clear targets and deadlines in place" },
  { value: 4, label: "4 - Some Progress", desc: "Action plan operational - some progress in established targets" },
  { value: 5, label: "5 - Achieving Targets", desc: "Action plan operational - achieving the target set" },
];

export default function QuestionCard({ question, selectedScore, onScoreSelect }: QuestionCardProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-6 shadow-lg">
      {/* SDG Info */}
      <div className="flex items-center mb-4 bg-white p-4 rounded-lg">
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4 flex-shrink-0"
          style={{ backgroundColor: SDG_COLORS[question.sdg_number] || "#666" }}
        >
          {question.sdg_number}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg">SDG {question.sdg_number}: {question.sdg_description}</h3>
          <p className="text-sm text-gray-600">{question.sdg_target}</p>
        </div>
        <span 
          className="px-3 py-1 rounded-full text-white text-sm font-medium ml-2"
          style={{ backgroundColor: DIMENSION_COLORS[question.sustainability_dimension] || "#999" }}
        >
          {question.sustainability_dimension}
        </span>
      </div>

      {/* KPI */}
      <div className="mb-4">
        <strong className="text-sm text-gray-600">KPI:</strong>
        <p className="text-gray-800">{question.kpi}</p>
      </div>

      {/* Question */}
      <div className="mb-6">
        <p className="text-lg leading-relaxed text-gray-900">{question.question}</p>
      </div>

      {/* Score Options */}
      <div className="space-y-2">
        {SCORE_OPTIONS.map((opt) => (
          <label 
            key={opt.value}
            className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-purple-500 ${
              selectedScore === opt.value ? 'border-purple-600 bg-purple-50' : 'border-gray-200 bg-white'
            }`}
          >
            <input 
              type="radio"
              name="score"
              value={opt.value}
              checked={selectedScore === opt.value}
              onChange={() => onScoreSelect(opt.value)}
              className="mt-1 mr-4"
            />
            <div className="flex-1">
              <div className="font-semibold">{opt.label}</div>
              <div className="text-sm text-gray-600">{opt.desc}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
