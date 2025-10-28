// frontend/components/FormPage.tsx
"use client";

import React, { useState, useEffect, useContext } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QuestionCard from "./QuestionCard";
import { SheetContext } from "./SheetContext";

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


function FormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedSheet, setSelectedSheet } = useContext(SheetContext);
  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sector, setSector] = useState<string>("General");
  const [responses, setResponses] = useState<Record<string, number>>({});

  // Determine the sheet name: from context, or from URL if not set
  const sheetFromUrl = searchParams.get("sheet") || searchParams.get("sheet_name");
  useEffect(() => {
    let sheet = selectedSheet;
    if (!sheet && sheetFromUrl) {
      sheet = sheetFromUrl;
      setSelectedSheet(sheetFromUrl);
    }
    if (!sheet) return;
    async function fetchQuestionnaire() {
      setIsBusy(true);
      setError(null);
      try {
        const response = await fetch(`/api/questionnaire/template?sheet_name=${encodeURIComponent(sheet)}`, {
          method: "GET",
          headers: { "Cache-Control": "no-store" },
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || data?.success === false) {
          throw new Error(data?.error || "Failed to fetch questionnaire template");
        }
        const { questions: fetchedQuestions, sector: fetchedSector } = normalizeToQuestions(data);
        setQuestions(fetchedQuestions);
        setSector(fetchedSector);
      } catch (e) {
        setError((e as Error).message || "Failed to load questionnaire template");
        setQuestions(buildTemplateQuestions());
        setSector("General");
      } finally {
        setIsBusy(false);
      }
    }
    fetchQuestionnaire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSheet, sheetFromUrl]);

  const totalQuestions = questions.length;
  const currentQuestion = totalQuestions > 0 ? questions[currentIdx] : null;

  const handleScoreSelect = (score: number) => {
    if (!currentQuestion) return;
    const boundedScore = Math.max(0, Math.min(5, score));
    setResponses((prev) => ({ ...prev, [currentQuestion.id]: boundedScore }));
  };

  const goPrev = () => setCurrentIdx((prev) => Math.max(0, prev - 1));
  
  const goNext = () => {
    // Prevent navigation if on last question or if current question isn't answered
    if (currentIdx === totalQuestions - 1) return;
    if (!currentQuestion || isBusy || !Number.isFinite(responses[currentQuestion.id])) return;
    setCurrentIdx((prev) => Math.min(totalQuestions - 1, prev + 1));
  };

  const handleSubmitAnswers = async () => {
    if (totalQuestions === 0) return;
    setIsBusy(true);
    setError(null);
    try {
      const responsesArray = questions.map((q) => ({
        question_id: q.id,
        score: Number.isFinite(responses[q.id]) ? responses[q.id] : 0,
      }));

      const response = await fetch("/api/questionnaire/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: responsesArray, questions, sector }),
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
    questions.every((q) => Number.isFinite(responses[q.id]) && responses[q.id] >= 0 && responses[q.id] <= 5);
  const progress = totalQuestions > 0 ? Math.round(((currentIdx + 1) / totalQuestions) * 100) : 0;

  const goBackToSheetSelection = () => {
    router.push("/sheet-selection");
  };


  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">Interactive Questionnaire</h2>
          <p className="text-neutral text-sm">
            Sector: {sector} | {totalQuestions} Questions
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
            {totalQuestions > 0 ? `Question ${currentIdx + 1} of ${totalQuestions}` : "No questions available"}
          </div>

          <div className="animate-slideIn">
            {currentQuestion ? (
              <div className="space-y-4">
                <QuestionCard
                  question={currentQuestion}
                  selectedScore={selectedScore}
                  onScoreSelect={handleScoreSelect}
                />
              </div>
            ) : (
              <div className="text-center text-neutral">
                No questions available. Please upload a valid Excel file or try again.
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
              {/* Next button - always visible, disabled on last question or when current question not answered */}
              <button
                onClick={goNext}
                disabled={isLastQuestion || !currentQuestionAnswered || isBusy}
                className={`px-4 py-2 bg-black text-white rounded-lg transition-opacity hover:bg-gray-800
                  ${isLastQuestion || !currentQuestionAnswered || isBusy 
                    ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`}
              >
                Next
              </button>
              
              {/* Submit button - only visible on last question */}
              {isLastQuestion && (
                <button
                  onClick={handleSubmitAnswers}
                  disabled={!allAnswered || isBusy}
                  className={`px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2 transition-opacity
                    ${!allAnswered || isBusy 
                      ? "opacity-50 cursor-not-allowed" 
                      : "hover:bg-gray-800"}`}
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

      <div className="mt-6">
        <button
          onClick={goBackToSheetSelection}
          className="px-4 py-2 bg-gray-300 text-black rounded-lg"
        >
          Back to Sheet Selection
        </button>
      </div>
    </div>
  );
}

export default FormPage;