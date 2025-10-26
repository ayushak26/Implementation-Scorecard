// frontend/components/FormPage.tsx
"use client";

import React, { useState, useEffect, useMemo, useContext,useRef} from "react";
import { useRouter } from "next/navigation";
import QuestionCard from "./QuestionCard";
import { SDGContext } from "./SDGContext";

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

type SectorData = Record<string, { rows: Question[] }>;

const DEFAULT_SDGS = Array.from({ length: 17 }, (_, i) => i + 1);
const DEFAULT_DIMENSIONS = [
  "Economic Performance",
  "Circular Performance",
  "Environmental Performance",
  "Social Performance",
];

function buildTemplateQuestions(
  sdgs: number[] = DEFAULT_SDGS,
  dimensions: string[] = DEFAULT_DIMENSIONS,
  sector = "General",
  maxQuestions = 10
): Question[] {
  const questions: Question[] = [];
  for (const sdg of sdgs) {
    for (const dim of dimensions) {
      if (questions.length >= maxQuestions) break;
      questions.push({
        id: `sdg${sdg}-${dim.replace(/\s+/g, "_").toLowerCase()}`,
        sdg_number: sdg,
        sdg_description: `SDG ${sdg}`,
        sdg_target: "",
        sustainability_dimension: dim,
        kpi: "",
        question: `Rate ${dim} for SDG ${sdg}`,
        sector,
      });
    }
    if (questions.length >= maxQuestions) break;
  }
  return questions;
}

function normalizeToQuestions(payload: any): { questions: Question[]; sector: string } {
  if (Array.isArray(payload?.questions)) {
    const sector = typeof payload?.sector === "string" && payload.sector.trim() ? payload.sector : "General";
    return { questions: payload.questions as Question[], sector };
  }
  if (
    Array.isArray(payload?.sdgs) ||
    Array.isArray(payload?.dimensions) ||
    typeof payload?.score_rubric === "object"
  ) {
    const sdgs = Array.isArray(payload?.sdgs) ? payload.sdgs : DEFAULT_SDGS;
    const dims = Array.isArray(payload?.dimensions) ? payload.dimensions : DEFAULT_DIMENSIONS;
    const sector = typeof payload?.sector === "string" ? payload.sector : "General";
    return { questions: buildTemplateQuestions(sdgs, dims, sector, 10), sector };
  }
  return { questions: buildTemplateQuestions(), sector: "General" };
}

export default function FormPage() {
  const context = useContext(SDGContext);
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const hasFetched = useRef(false); // Add this

  if (!context) return null;

  const { questions, sector, selectedSector, setSelectedSector } = context;

  // Compute unique sectors and filtered questions
  const uniqueSectors = useMemo(() => {
    const sectors = Array.from(new Set(questions.map(q => q.sector))).filter(s => s && s.trim());
    return ["All Sectors", ...sectors];
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    if (!selectedSector || selectedSector === "All Sectors") return questions;
    return questions.filter(q => q.sector.toLowerCase() === selectedSector.toLowerCase());
  }, [questions, selectedSector]);

  // Reset currentIdx and responses when filtered questions change
  useEffect(() => {
    setCurrentIdx(0);
    setResponses(prev => {
      const validIds = new Set(filteredQuestions.map(q => q.id));
      const newResponses: Record<string, number> = {};
      for (const [id, score] of Object.entries(prev)) {
        if (validIds.has(id)) {
          newResponses[id] = score;
        }
      }
      return newResponses;
    });
  }, [filteredQuestions]);

  useEffect(() => {
    async function fetchQuestionnaire() {
      hasFetched.current = true;
      setIsBusy(true);
      setError(null);
      try {
        const response = await fetch("/api/questionnaire/template", {
          method: "GET",
          headers: { "Cache-Control": "no-store" },
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || data?.success === false) {
          throw new Error(data?.error || "Failed to fetch questionnaire template");
        }
        const { questions: fetchedQuestions, sector: fetchedSector } = normalizeToQuestions(data);
        context.setQuestions(fetchedQuestions);
        context.setSector(fetchedSector);
        context.setSelectedSector("All Sectors"); // Default to All Sectors
      } catch (e) {
        setError((e as Error).message || "Failed to load questionnaire template. Please ensure the Excel file contains valid sheets with required headers.");
        context.setQuestions(buildTemplateQuestions());
        context.setSector("General");
        context.setSelectedSector("All Sectors");
      } finally {
        setIsBusy(false);
      }
    }
    fetchQuestionnaire();
  }, []);

  const totalQuestions = filteredQuestions.length;
  const currentQuestion = totalQuestions > 0 ? filteredQuestions[currentIdx] : null;

  const handleScoreSelect = (score: number) => {
    if (!currentQuestion) return;
    const boundedScore = Math.max(0, Math.min(5, score));
    setResponses((prev) => ({ ...prev, [currentQuestion.id]: boundedScore }));
  };

  const goPrev = () => setCurrentIdx((prev) => Math.max(0, prev - 1));

  const goNext = () => {
    if (currentIdx === totalQuestions - 1) return;
    if (!currentQuestion || isBusy || !Number.isFinite(responses[currentQuestion.id])) return;
    setCurrentIdx((prev) => Math.min(totalQuestions - 1, prev + 1));
  };

  const handleSubmitAnswers = async () => {
    if (totalQuestions === 0) return;
    setIsBusy(true);
    setError(null);
    try {
      const responsesArray = filteredQuestions.map((q) => ({
        question_id: q.id,
        score: Number.isFinite(responses[q.id]) ? responses[q.id] : 0,
      }));

      const response = await fetch("/api/questionnaire/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: responsesArray, questions: filteredQuestions, sector: selectedSector || sector }),
      });

      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || "Failed to calculate scorecard");
      }

      const result: SectorData | null = data?.data && typeof data.data === "object" ? data.data : null;
      if (!result || !Object.keys(result).length) {
        throw new Error("No scorecard data returned");
      }

      try {
        sessionStorage.setItem("scorecard", JSON.stringify(result));
      } catch {
        await fetch("/api/result/save", {
          method: "POST",
          body: JSON.stringify(result),
        });
      }

      router.push("/visualization");
    } catch (e) {
      setError((e as Error).message || "Failed to submit answers");
    } finally {
      setIsBusy(false);
    }
  };

  const selectedScore = currentQuestion ? responses[currentQuestion.id] : undefined;
  const canPrev = currentIdx > 0;
  const isLastQuestion = currentIdx === totalQuestions - 1;
  const currentQuestionAnswered = currentQuestion && Number.isFinite(responses[currentQuestion.id]);
  const allAnswered =
    totalQuestions > 0 &&
    filteredQuestions.every((q) => Number.isFinite(responses[q.id]) && responses[q.id] >= 0 && responses[q.id] <= 5);
  const progress = totalQuestions > 0 ? Math.round(((currentIdx + 1) / totalQuestions) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">Interactive Questionnaire</h2>
          <p className="text-neutral text-sm">
            Sector: {selectedSector || sector} | {totalQuestions} Questions
          </p>
        </div>
        <div className="relative w-64">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-gray-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="absolute -top-6 right-0 text-xs text-neutral">{progress}% Complete</span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-primary mb-2">Select Sector</h3>
        <div className="flex flex-wrap gap-2">
          {uniqueSectors.map(sector => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                selectedSector === sector
                  ? "bg-primary text-white"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
            >
              {sector}
            </button>
          ))}
        </div>
        <p className="text-sm text-neutral mt-2">
          Select a sector to view its questions or choose "All Sectors" to see questions from both Textiles and Fertilizers.
        </p>
      </div>

      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 animate-shake"
          role="alert"
        >
          {error}
        </div>
      )}

      {isBusy ? (
        <div className="text-center text-neutral">Loading questionnaire...</div>
      ) : (
        <>
          <div className="text-center text-neutral text-sm mb-4">
            {totalQuestions > 0
              ? `Question ${currentIdx + 1} of ${totalQuestions}`
              : `No questions available${selectedSector && selectedSector !== "All Sectors" ? ` for sector "${selectedSector}"` : ""}.`}
          </div>

          <div className="animate-slideIn">
            {currentQuestion ? (
              <QuestionCard
                question={currentQuestion}
                selectedScore={selectedScore}
                onScoreSelect={handleScoreSelect}
              />
            ) : (
              <div className="text-center text-neutral">
                No questions available{selectedSector && selectedSector !== "All Sectors" ? ` for sector "${selectedSector}"` : ""}. 
                Please upload a valid Excel file with required headers or try a different sector.
              </div>
            )}
          </div>

          <div className="flex justify-between mt-8 gap-4" style={{ minHeight: '40px' }}>
            <button
              onClick={goPrev}
              disabled={!canPrev || isBusy}
              className={`px-4 py-2 border border-gray-300 rounded-lg text-gray-600 transition-opacity
                ${!canPrev || isBusy ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
            >
              Previous
            </button>

            <div className="flex gap-4">
              <button
                onClick={goNext}
                disabled={isLastQuestion || !currentQuestionAnswered || isBusy}
                className={`px-4 py-2 bg-primary text-white rounded-lg transition-opacity
                  ${isLastQuestion || !currentQuestionAnswered || isBusy 
                    ? "opacity-50 cursor-not-allowed" 
                    : "hover:bg-primary/90"}`}
              >
                Next
              </button>
              
              {isLastQuestion && (
                <button
                  onClick={handleSubmitAnswers}
                  disabled={!allAnswered || isBusy}
                  className={`px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 transition-opacity
                    ${!allAnswered || isBusy 
                      ? "opacity-50 cursor-not-allowed" 
                      : "hover:bg-primary/90"}`}
                >
                  {isBusy && (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  Submit & View Results
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}