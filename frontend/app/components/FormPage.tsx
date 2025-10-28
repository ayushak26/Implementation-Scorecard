// app/components/FormPage.tsx
"use client";

import React, { useEffect, useMemo, useState, useContext } from "react";
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

const DIM_ORDER = ["Circular", "Environmental", "Economic", "Social"] as const;
const DIM_SET = new Set(DIM_ORDER);
const SECTOR_ORDER = ["Textiles", "Fertilizers", "Packaging"] as const;

const DEFAULT_RUBRIC: Record<number, string> = {
  0: "N/A",
  1: "Issue identified, but no plans for further actions",
  2: "Issue identified, starts planning further actions",
  3: "Action plan with clear targets and deadlines in place",
  4: "Action plan operational - some progress in established targets",
  5: "Action plan operational - achieving the target set",
};

const norm = (s: string) => (s || "").trim().toLowerCase();
const makeKey = (q: Question) =>
  `${norm(q.sector)}|${q.sdg_number}|${norm(q.sustainability_dimension)}`;

const canonicalSector = (s?: string): string => {
  const aliases: Record<string, string> = {
    textile: "Textiles",
    textiles: "Textiles",
    fertilizer: "Fertilizers",
    fertilizers: "Fertilizers",
    packaging: "Packaging",
  };
  const k = norm(s || "");
  return aliases[k] || SECTOR_ORDER[0];
};

const canonicalDim = (d?: string): string => {
  const t = (d || "").trim();
  return DIM_SET.has(t as any) ? t : "";
};

const sanitizeQuestions = (qs: Question[]): Question[] => {
  const seen = new Set<string>();
  const result: Question[] = [];

  for (const q of qs) {
    const sector = canonicalSector(q.sector);
    const dim = canonicalDim(q.sustainability_dimension);
    if (!dim) continue;

    const key = makeKey({ ...q, sector, sustainability_dimension: dim });
    if (seen.has(key)) continue;

    seen.add(key);
    result.push({ ...q, sector, sustainability_dimension: dim });
  }
  return result;
};

const sortByDim = (a: Question, b: Question) => {
  const ia = DIM_ORDER.indexOf(a.sustainability_dimension as any);
  const ib = DIM_ORDER.indexOf(b.sustainability_dimension as any);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
};

const pickFourDimsFor = (arr: Question[]): Question[] | null => {
  if (!arr.length) return null;
  const byDim = new Map<string, Question>();

  for (const q of arr) {
    const dim = q.sustainability_dimension;
    if (DIM_SET.has(dim as any) && !byDim.has(dim)) byDim.set(dim, q);
  }

  const four: Question[] = [];
  for (const d of DIM_ORDER) {
    const q = byDim.get(d);
    if (!q) return null;
    four.push(q);
  }
  return four.sort(sortByDim);
};

const buildPages = (questions: Question[], activeSector: string): Question[][] => {
  const pages: Question[][] = [];
  if (!activeSector) return pages;

  for (let sdg = 1; sdg <= 17; sdg++) {
    const pool = questions.filter(
      (q) => canonicalSector(q.sector) === activeSector && q.sdg_number === sdg
    );
    const four = pickFourDimsFor(pool);
    if (four) pages.push(four);
  }
  return pages;
};

export default function FormPage() {
  const router = useRouter();
  const context = useContext(SDGContext);
  if (!context) return null;

  const {
    questions: ctxQuestions,
    setQuestions: setCtxQuestions,
    selectedSector,
  } = context;

  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoresByKey, setScoresByKey] = useState<Record<string, number>>({});
  const [rubric, setRubric] = useState<Record<number, string>>(DEFAULT_RUBRIC);
  const [pageIdx, setPageIdx] = useState(0);

  const activeSector =
    selectedSector && SECTOR_ORDER.includes(selectedSector as any)
      ? selectedSector
      : SECTOR_ORDER[0];

  useEffect(() => {
    const fetchQuestions = async () => {
      setIsBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/questionnaire/template", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to load questions");
        }

        const data = await res.json();
        const raw: Question[] = Array.isArray(data.questions) ? data.questions : [];

        if (raw.length === 0) throw new Error("No questions available");

        const sanitized = sanitizeQuestions(raw);
        setCtxQuestions(sanitized);

        const init: Record<string, number> = {};
        sanitized.forEach((q) => {
          init[makeKey(q)] = 3;
        });
        setScoresByKey(init);

        if (data.score_rubric && typeof data.score_rubric === "object") {
          setRubric(data.score_rubric);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load questionnaire");
        setCtxQuestions([]);
      } finally {
        setIsBusy(false);
      }
    };

    fetchQuestions();
  }, [setCtxQuestions]);

  const filteredQuestions = useMemo(() => {
    return ctxQuestions.filter((q) => canonicalSector(q.sector) === activeSector);
  }, [ctxQuestions, activeSector]);

  const pages = useMemo(
    () => buildPages(filteredQuestions, activeSector),
    [filteredQuestions, activeSector]
  );
  const totalPages = pages.length;
  const currentPage = totalPages > 0 ? pages[pageIdx] : [];

  useEffect(() => {
    setPageIdx(0);
  }, [activeSector]);

  const handleScoreSelect = (key: string, score: number) => {
    const bounded = Math.max(0, Math.min(5, score));
    setScoresByKey((prev) => ({ ...prev, [key]: bounded }));
  };

  const pageComplete =
    currentPage.length === 4 &&
    currentPage.every((q) => Number.isFinite(scoresByKey[makeKey(q)]));

  const allComplete =
    pages.length > 0 &&
    pages.every((page) => page.every((q) => Number.isFinite(scoresByKey[makeKey(q)])));

  const progress =
    totalPages > 0 ? Math.round(((pageIdx + 1) / totalPages) * 100) : 0;

  const goPrev = () => setPageIdx((i) => Math.max(0, i - 1));
  const goNext = () => {
    if (pageIdx < totalPages - 1 && pageComplete) {
      setPageIdx((i) => i + 1);
    }
  };

  const handleSubmit = async () => {
    if (!allComplete) return;
    setIsBusy(true);
    setError(null);

    try {
      const questionsWithId = pages.flat().map((q) => ({
        ...q,
        id: makeKey(q),
      }));

      const responses = pages.flat().map((q) => ({
        question_id: makeKey(q),
        score: scoresByKey[makeKey(q)] ?? 3,
      }));

      const res = await fetch("/api/questionnaire/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses,
          questions: questionsWithId,
          sector: activeSector,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error || "Failed to calculate results");
      }

      const result = payload.data;
      if (!result || typeof result !== "object" || !Object.keys(result).length) {
        throw new Error("Invalid scorecard data");
      }

      sessionStorage.setItem("scorecard", JSON.stringify(result));
      router.push("/visualization");
    } catch (err: any) {
      setError(err.message || "Submission failed");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">Interactive Questionnaire</h2>
          <p className="text-neutral text-sm">
            Sector: <span className="font-medium">{activeSector}</span> | {filteredQuestions.length} Questions
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

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 animate-shake">
          {error}
        </div>
      )}

      {/* Loading / Empty / Content */}
      {isBusy ? (
        <div className="text-center text-neutral py-12">
          Loading questions for <strong>{activeSector}</strong>...
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center text-neutral py-12">
          No complete 4-dimension cards available for <strong>{activeSector}</strong>.
        </div>
      ) : (
        <>
          <QuestionCard
            questions={currentPage}
            selectedScores={scoresByKey}
            onScoreSelect={handleScoreSelect}
            scoreRubric={rubric}
          />

          <div className="flex justify-between mt-8 gap-4">
            {/* Previous */}
            <button
              onClick={goPrev}
              disabled={pageIdx === 0 || isBusy}
              className={`px-4 py-2 border border-gray-300 rounded-lg text-gray-600 transition-opacity ${
                pageIdx === 0 || isBusy ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
              }`}
            >
              Previous
            </button>

            {/* Next vs Submit */}
            {pageIdx < totalPages - 1 ? (
              <button
                onClick={goNext}
                disabled={!pageComplete || isBusy}
                className={`
                  px-4 py-2 bg-black text-white rounded-lg font-medium
                  transition-all duration-200
                  ${
                    !pageComplete || isBusy
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:opacity-90 hover:shadow-md"
                  }`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!allComplete || isBusy}
                className={`
                  px-4 py-2 bg-primary text-white rounded-lg font-medium
                  transition-all duration-200 flex items-center gap-2
                  ${
                    !allComplete || isBusy
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:opacity-90 hover:shadow-md"
                  }`}
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
        </>
      )}
    </div>
  );
}
