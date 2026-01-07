// app/components/FormPage.tsx
"use client";

import React, { useEffect, useMemo, useState, useContext, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom"; 
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
  recommendations?: {  // ← ADD THIS!
    awareness?: { text?: string; source?: string };
    developing?: { text?: string; source?: string };
    leading?: { text?: string; source?: string };
  };
};

type SectorData = Record<string, { rows: Question[] }>;

const DIM_ORDER = ["Circular", "Environmental", "Economic", "Social"] as const;
const DIM_SET = new Set(DIM_ORDER);
const SECTOR_ORDER = ["Textiles", "Fertilizers", "Packaging"] as const;

const DEFAULT_RUBRIC: Record<number, string> = {
  0: "Score Description: N/A",
  1: "Score Description: Issue identified, but no plans for further actions",
  2: "Score Description: Issue identified, starts planning further actions",
  3: "Score Description: Action plan with clear targets and deadlines in place",
  4: "Score Description: Action plan operational - some progress in established targets",
  5: "Score Description: Action plan operational - achieving the target set",
};

// Tooltip definitions
const TOOLTIPS: Record<string, string> = {
  "Implementation Scorecard": "A comprehensive assessment tool to evaluate your organization's sustainability performance across multiple dimensions and SDGs",
  "Sector": "The industry category your organization belongs to, which determines the relevant sustainability questions",
  "SDG": "Sustainable Development Goals - 17 global objectives adopted by the UN to achieve a better future for all by 2030",
  "Score": "Rating from 0-5 indicating your organization's level of action and achievement on sustainability targets",
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

// ---------------- Tooltip Component ----------------
const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, flip: false });
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (show && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipHeight = 100; // Approximate tooltip height
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      
      // Decide whether to show above or below
      const shouldFlip = spaceAbove < tooltipHeight && spaceBelow > spaceAbove;
      
      setPosition({
        top: shouldFlip ? rect.bottom + 10 : rect.top - 10,
        left: rect.left + rect.width / 2,
        flip: shouldFlip,
      });
    }
  }, [show]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help border-b border-dotted border-green-600 inline-block"
      >
        {children}
      </span>
      
      {show && typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[9999] px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg w-64 pointer-events-none"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: position.flip ? 'translate(-50%, 0%)' : 'translate(-50%, -100%)',
            }}
          >
            {text}
            {/* Arrow pointing up or down based on flip */}
            {position.flip ? (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-0">
                <div className="border-4 border-transparent border-b-gray-900"></div>
              </div>
            ) : (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};

export default function FormPage() {
  const router = useRouter();
  const context = useContext(SDGContext);
  const containerRef = useRef<HTMLDivElement>(null);
  
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
        let raw: Question[] = [];
        let dataSource = "";
        
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("uploadedQuestions");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                raw = parsed;
                dataSource = "Uploaded Excel (localStorage)";
                console.log(`✅ Using uploaded Excel from localStorage (${parsed.length} questions)`);
              }
            } catch (e) {
              console.warn("Failed to parse stored questions:", e);
              localStorage.removeItem("uploadedQuestions");
            }
          }
        }
        
        if (raw.length === 0) {
          console.log("📡 No uploaded Excel found, using default Excel...");
          
          const res = await fetch("/api/questionnaire/template", {
            method: "GET",
            cache: "no-store",
          });

          if (!res.ok) {
            const errorText = await res.text();
            let errorMsg = "Failed to load questions";
            
            try {
              const errorData = JSON.parse(errorText);
              errorMsg = errorData?.detail || errorData?.error || errorMsg;
            } catch {
              errorMsg = errorText || errorMsg;
            }
            
            throw new Error(errorMsg);
          }

          const data = await res.json();
          raw = Array.isArray(data.questions) ? data.questions : [];
          dataSource = "Default Excel (backend/data/final.xlsx)";
          
          console.log(`✅ Using default Excel from API (${raw.length} questions)`);
        }

        if (raw.length === 0) {
          throw new Error("No questions available. Please upload an Excel file.");
        }

        console.log(`📊 Loaded ${raw.length} questions from: ${dataSource}`);

        const sanitized = sanitizeQuestions(raw);
        setCtxQuestions(sanitized);
        setScoresByKey({});

      } catch (err: any) {
        console.error("Failed to fetch questions:", err);
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

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pageIdx]);

  const handleScoreSelect = (key: string, score: number) => {
    const bounded = Math.max(0, Math.min(5, score));
    setScoresByKey((prev) => ({ ...prev, [key]: bounded }));
  };

  const pageComplete =
    currentPage.length === 4 &&
    currentPage.every((q) => scoresByKey[makeKey(q)] !== undefined);

  const allComplete =
    pages.length > 0 &&
    pages.every((page) => page.every((q) => scoresByKey[makeKey(q)] !== undefined));

  const progress =
    totalPages > 0 ? Math.round(((pageIdx + 1) / totalPages) * 100) : 0;

  const goPrev = () => setPageIdx((i) => Math.max(0, i - 1));
  
  const goNext = () => {
    if (pageIdx < totalPages - 1 && pageComplete) {
      setPageIdx((i) => i + 1);
    }
  };

  const handleSubmit = async () => {
    if (!allComplete || isBusy) return;

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
          questions: questionsWithId
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMsg = "Failed to calculate results";
        
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData?.detail || errorData?.error || errorMsg;
        } catch {
          errorMsg = errorText || errorMsg;
        }
        
        throw new Error(errorMsg);
      }

      const payload = await res.json();

      if (!payload || payload.success === false) {
        throw new Error(payload?.error || "Calculation failed");
      }

      const result = payload.data;
      if (!result || typeof result !== "object" || !Object.keys(result).length) {
        throw new Error("Invalid scorecard data returned from server");
      }

      sessionStorage.setItem("scorecard", JSON.stringify(result));
      sessionStorage.setItem("scorecardSector", activeSector);

      router.push("/visualization");
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err.message || "Submission failed. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="w-full flex justify-center" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%)', minHeight: '100vh' }}>
      <div
        ref={containerRef}
        className="
          w-full
          max-w-[95vw]
          sm:max-w-[90vw]
          md:max-w-4xl
          lg:max-w-5xl
          xl:max-w-6xl
          2xl:max-w-7xl
          transition-all duration-300
          bg-white rounded-2xl shadow-lg border-2 border-green-200
          p-4 sm:p-6 md:p-8
          mx-auto my-8
        "
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3 pb-4 border-b-2 border-green-100">
          <div>
            <h2 className="text-2xl font-bold text-green-700 flex items-center gap-2">
              <Tooltip text={TOOLTIPS["Implementation Scorecard"]}>
                BIORADAR – Implementation Scorecard
              </Tooltip>
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              <Tooltip text={TOOLTIPS.Sector}>
                <span className="font-medium">Sector:</span>
              </Tooltip>{" "}
              <span className="font-semibold text-green-700">{activeSector}</span>
              {" | "}
              {filteredQuestions.length} Questions
            </p>
          </div>
  
          <div className="relative w-full sm:w-64">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-700">Progress</span>
              <span className="text-xs font-bold text-green-700 ml-auto">
                {progress}%
              </span>
            </div>
            <div className="w-full h-3 bg-green-100 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-r-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                  <strong className="text-green-700">SDG Questions:</strong>
                  {" "}
                Answer all questions for each{" "}
                <Tooltip text={TOOLTIPS.Score}>
                  <span className="font-medium">sustainability dimension</span>
                </Tooltip>
                . Hover over underlined terms for more information.
              </p>
            </div>
          </div>
        </div>
  
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-lg p-4 mb-6 animate-shake">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
  
        {isBusy && pages.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600 mb-4"></div>
            <p className="text-lg">
              Loading questions for <strong className="text-green-700">{activeSector}</strong>...
            </p>
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-lg font-semibold mb-2">
              No complete 4-dimension cards available for{" "}
              <strong>{activeSector}</strong>
            </p>
            <p className="text-sm mt-2">
              Please try uploading an Excel file with questions.
            </p>
          </div>
        ) : (
          <>
            <QuestionCard
              questions={currentPage}
              selectedScores={scoresByKey}
              onScoreSelect={handleScoreSelect}
              scoreRubric={rubric}
            />
  
            <div className="flex justify-between mt-8 gap-4 flex-wrap">
              <button
                onClick={goPrev}
                disabled={pageIdx === 0 || isBusy}
                className={`px-6 py-3 border-2 border-green-300 rounded-lg text-green-700 font-medium transition-all flex items-center gap-2 ${
                  pageIdx === 0 || isBusy
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-green-50 hover:border-green-500"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
  
              {pageIdx < totalPages - 1 ? (
                <button
                  onClick={goNext}
                  disabled={!pageComplete || isBusy}
                  className={`
                    px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium
                    transition-all duration-200 flex items-center gap-2 shadow-md
                    ${
                      !pageComplete || isBusy
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:from-green-700 hover:to-emerald-700 hover:shadow-lg"
                    }`}
                >
                  Next
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!allComplete || isBusy}
                  className={`
                    px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium 
                    transition-all duration-200 flex items-center gap-2 shadow-md
                    ${
                      !allComplete || isBusy
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:from-green-700 hover:to-emerald-700 hover:shadow-lg"
                    }`}
                >
                  {isBusy && (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  {isBusy ? "Submitting..." : "Submit & View Results"}
                  {!isBusy && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  )}
                </button>
              )}
            </div>
  
            <div className="text-center mt-6 pt-4 border-t-2 border-green-100">
              <span className="text-sm font-medium text-gray-600">
                Page <span className="text-green-700 font-bold">{pageIdx + 1}</span> of <span className="text-green-700 font-bold">{totalPages}</span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}