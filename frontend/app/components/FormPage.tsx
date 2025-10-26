// app/components/FormPage.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import QuestionCard from "./QuestionCard";

/* ============================ Types ============================ */
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

/* ============================ Defaults & Utils ============================ */

const DEFAULT_SDGS = Array.from({ length: 17 }, (_, i) => i + 1);
const DEFAULT_DIMENSIONS = [
  "Economic Performance",
  "Circular Performance",
  "Environmental Performance",
  "Social Performance",
];

// Build a simple, usable questionnaire with a cap at 10 questions
function buildTemplateQuestions(
  sdgs: number[] = DEFAULT_SDGS,
  dimensions: string[] = DEFAULT_DIMENSIONS,
  sector = "General",
  maxQuestions = 10
): Question[] {
  const qs: Question[] = [];
  for (const sdg of sdgs) {
    for (const dim of dimensions) {
      if (qs.length >= maxQuestions) break; // Cap at 10 questions
      qs.push({
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
    if (qs.length >= maxQuestions) break; // Exit outer loop if cap reached
  }
  return qs;
}

function normalizeToQuestions(payload: any): { questions: Question[]; sector: string } {
  if (Array.isArray(payload?.questions)) {
    const sector =
      typeof payload?.sector === "string" && payload.sector.trim()
        ? payload.sector
        : "General";
    return { questions: payload.questions as Question[], sector };
  }
  if (
    Array.isArray(payload?.sdgs) ||
    Array.isArray(payload?.dimensions) ||
    typeof payload?.score_rubric === "object"
  ) {
    const sdgs: number[] = Array.isArray(payload?.sdgs) ? payload.sdgs : DEFAULT_SDGS;
    const dims: string[] = Array.isArray(payload?.dimensions)
      ? payload.dimensions
      : DEFAULT_DIMENSIONS;
    const sector = typeof payload?.sector === "string" ? payload.sector : "General";
    return { questions: buildTemplateQuestions(sdgs, dims, sector, 10), sector };
  }
  return { questions: buildTemplateQuestions([], [], "General", 10), sector: "General" };
}

/* ============================ Component ============================ */

export default function FormPage() {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sector, setSector] = useState<string>("General");
  const [responses, setResponses] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchQuestionnaire = async () => {
      setIsBusy(true);
      setError(null);
      try {
        const response = await fetch("/api/questionnaire/template", {
          method: "GET",
          headers: { "Cache-Control": "no-store" },
          cache: "no-store",
        });
        const raw = await response.json().catch(() => ({}));
        if (!response.ok || raw?.success === false) {
          throw new Error(raw?.error || "Failed to fetch questionnaire template");
        }
        const { questions: qs, sector: sec } = normalizeToQuestions(raw);
        setQuestions(qs);
        setSector(sec);
      } catch (e: any) {
        setError(e?.message || "Failed to load questionnaire template.");
        const fallback = buildTemplateQuestions([], [], "General", 10);
        setQuestions(fallback);
        setSector("General");
      } finally {
        setIsBusy(false);
      }
    };
    fetchQuestionnaire();
  }, []);

  const totalQuestions = questions.length;
  const currentQuestion = totalQuestions > 0 ? questions[currentIdx] : null;

  const handleScoreSelect = (score: number) => {
    if (!currentQuestion) return;
    const bounded = Math.max(0, Math.min(5, Number(score)));
    setResponses((prev) => ({ ...prev, [currentQuestion.id]: bounded }));
  };

  const goPrev = () => setCurrentIdx((i) => Math.max(0, i - 1));
  const goNext = () => setCurrentIdx((i) => Math.min(totalQuestions - 1, i + 1));

  const handleSubmitAnswers = async () => {
    if (totalQuestions === 0) return;
    setIsBusy(true);
    setError(null);
    try {
      const responsesArray = questions.map((q) => ({
        question_id: q.id,
        score: Number.isFinite(responses[q.id]) ? responses[q.id] : 0,
      }));

      const body = JSON.stringify({ responses: responsesArray, questions, sector });

      const resp = await fetch("/api/questionnaire/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok || payload?.success === false) {
        throw new Error(payload?.error || "Failed to calculate scorecard.");
      }

      const result: SectorData | null =
        payload?.data && typeof payload.data === "object" ? payload.data : null;
      if (!result || Object.keys(result).length === 0) {
        throw new Error("No scorecard data returned.");
      }

      // Store in sessionStorage to avoid query string issues
      try {
        sessionStorage.setItem("scorecard", JSON.stringify(result));
      } catch {
        await fetch("/api/result/save", { method: "POST", body: JSON.stringify(result) });
      }

      router.push("/visualization");
    } catch (e: any) {
      setError(e?.message || "Failed to submit answers.");
    } finally {
      setIsBusy(false);
    }
  };

  const selectedScore = currentQuestion ? responses[currentQuestion.id] : undefined;
  const canPrev = currentIdx > 0;
  const canNext = currentIdx < totalQuestions - 1;
  const allAnswered =
    totalQuestions > 0 &&
    questions.every(
      (q) =>
        Number.isFinite(responses[q.id]) &&
        responses[q.id] >= 0 &&
        responses[q.id] <= 5
    );
  const pct =
    totalQuestions > 0
      ? Math.round(((currentIdx + 1) / totalQuestions) * 100)
      : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">Interactive Questionnaire</h2>
          <p className="text-neutral text-sm">
            Sector: {sector} | Answer {totalQuestions} questions
          </p>
        </div>
        <div className="relative w-64">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-gray-600 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="absolute -top-6 right-0 text-xs text-neutral">
            {pct}% Complete
          </span>
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
            {totalQuestions > 0
              ? `Question ${currentIdx + 1} / ${totalQuestions}`
              : "No questions available"}
          </div>

          <div className="animate-slideIn">
            {currentQuestion && (
              <QuestionCard
                question={{
                  sdg_number: currentQuestion.sdg_number,
                  sdg_description: currentQuestion.sdg_description,
                  sdg_target: currentQuestion.sdg_target,
                  sustainability_dimension: currentQuestion.sustainability_dimension,
                  kpi: currentQuestion.kpi,
                  question: currentQuestion.question,
                }}
                selectedScore={selectedScore}
                onScoreSelect={handleScoreSelect}
              />
            )}
            {totalQuestions === 0 && !error && (
              <div>No questions available. Please upload a valid Excel file or try again later.</div>
            )}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={goPrev}
              disabled={!canPrev || isBusy}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-60 transition-all duration-300"
            >
              Previous
            </button>

            {canNext ? (
              <button
                onClick={goNext}
                disabled={!Number.isFinite(selectedScore) || isBusy}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-gray-800 disabled:opacity-60 transition-all duration-300"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmitAnswers}
                disabled={!allAnswered || isBusy}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-gray-800 disabled:opacity-60 transition-all duration-300 flex items-center gap-2"
              >
                {isBusy ? (
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
                ) : (
                  "Submit & View Results"
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}