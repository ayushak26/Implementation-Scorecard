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

// Canonical sector order
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
const makeKey = (q: Question) => `${norm(q.sector)}|${q.sdg_number}|${norm(q.sustainability_dimension)}`;

const sectorAliases: Record<string, string> = {
  "textile": "Textiles",
  "textiles": "Textiles",
  "fertilizer": "Fertilizers",
  "fertilizers": "Fertilizers",
  "packaging": "Packaging",
};

function canonicalSector(s?: string): string {
  const k = norm(s || "");
  return sectorAliases[k] || (s?.trim() || "General");
}

function canonicalDim(d?: string): string {
  const t = (d || "").trim();
  return (DIM_SET.has(t as any) ? t : d || "").trim();
}

/** Normalize & dedupe */
function sanitizeQuestions(qs: Question[]): Question[] {
  const seen = new Set<string>();
  const out: Question[] = [];
  for (const q of qs) {
    const sector = canonicalSector(q.sector);
    const dim = canonicalDim(q.sustainability_dimension);
    if (!DIM_SET.has(dim as any)) continue;

    const normQ: Question = { ...q, sector, sustainability_dimension: dim };
    const key = makeKey(normQ);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normQ);
  }
  return out;
}

function sortByDim(a: Question, b: Question) {
  const ia = DIM_ORDER.indexOf(a.sustainability_dimension as any);
  const ib = DIM_ORDER.indexOf(b.sustainability_dimension as any);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
}

function pickFourDimsFor(arr: Question[]): Question[] | null {
  if (!arr?.length) return null;
  const byDim = new Map<string, Question>();
  for (const q of arr) {
    if (DIM_SET.has(q.sustainability_dimension as any) && !byDim.has(q.sustainability_dimension)) {
      byDim.set(q.sustainability_dimension, q);
    }
  }
  const four: Question[] = [];
  for (const d of DIM_ORDER) {
    const q = byDim.get(d);
    if (!q) return null; // all four required
    four.push(q);
  }
  return four.sort(sortByDim);
}

// Build pages for a provided list of sectors (length 1, 2, or 3)
function buildPages(questions: Question[], activeSectors: string[]) {
  const pages: Question[][] = [];
  const orderedSectors = SECTOR_ORDER.filter((s) => activeSectors.includes(s));

  for (const sector of orderedSectors) {
    for (let sdg = 1; sdg <= 17; sdg++) {
      const pool = questions.filter(
        (q) => canonicalSector(q.sector) === sector && q.sdg_number === sdg
      );
      const four = pickFourDimsFor(pool);
      if (four) pages.push(four);
    }
  }
  return pages;
}

export default function FormPage() {
  const router = useRouter();
  const context = useContext(SDGContext);
  if (!context) return null;

  const {
    questions: ctxQuestions,
    setQuestions: setCtxQuestions,
    sector: ctxSector,
    setSector: setCtxSector,
    selectedSector,
    setSelectedSector,
  } = context;

  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoresByKey, setScoresByKey] = useState<Record<string, number>>({});
  const [rubric, setRubric] = useState<Record<number, string>>(DEFAULT_RUBRIC);
  const [pageIdx, setPageIdx] = useState(0);

  // NEW: local multi-select state (up to two sectors)
  const [selectedSectors, setSelectedSectors] = useState<string[]>([...SECTOR_ORDER]);

  useEffect(() => {
    const fetchQ = async () => {
      setIsBusy(true);
      setError(null);
      try {
        const r = await fetch("/api/questionnaire/template", {
          method: "GET",
          cache: "no-store",
          headers: { "Cache-Control": "no-store" },
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Failed to fetch questions");

        const raw: Question[] = Array.isArray(data?.questions) ? data.questions : [];
        if (raw.length === 0) throw new Error("No questions returned from API");

        const qs = sanitizeQuestions(raw);

        setCtxQuestions(qs);
        setCtxSector(typeof data?.sector === "string" ? canonicalSector(data.sector) : "General");

        // default to All Sectors
        setSelectedSector("All Sectors");
        setSelectedSectors([...SECTOR_ORDER]);

        const init: Record<string, number> = {};
        qs.forEach((q) => (init[makeKey(q)] = 3));
        setScoresByKey(init);

        if (data?.score_rubric && typeof data.score_rubric === "object") {
          setRubric(data.score_rubric as Record<number, string>);
        } else {
          setRubric(DEFAULT_RUBRIC);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load questionnaire");
        setCtxQuestions([]);
        setCtxSector("General");
        setSelectedSector("All Sectors");
        setSelectedSectors([...SECTOR_ORDER]);
      } finally {
        setIsBusy(false);
      }
    };
    fetchQ();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build sector pills list
  const sectors = useMemo(() => {
    const discovered = new Set<string>();
    ctxQuestions.forEach((q) => q.sector && discovered.add(canonicalSector(q.sector)));
    const ordered = Array.from(new Set<string>([...SECTOR_ORDER, ...Array.from(discovered)]));
    return ["All Sectors", ...ordered];
  }, [ctxQuestions]);

  // Compute active sectors (1, 2, or 3)
  const activeSectors = useMemo<string[]>(() => {
    if (selectedSector === "All Sectors") return [...SECTOR_ORDER];
    if (selectedSectors.length > 0) return selectedSectors.map(canonicalSector);
    if (selectedSector) return [canonicalSector(selectedSector)];
    return [...SECTOR_ORDER];
  }, [selectedSector, selectedSectors]);

  // Filter to active sectors
  const filtered = useMemo(() => {
    const set = new Set(activeSectors);
    return ctxQuestions.filter((q) => set.has(canonicalSector(q.sector)));
  }, [ctxQuestions, activeSectors]);

  // Build pages for current selection
  const pages = useMemo(() => buildPages(filtered, activeSectors), [filtered, activeSectors]);
  const totalPages = pages.length;
  const currentPage = totalPages > 0 ? pages[pageIdx] : [];

  useEffect(() => {
    setPageIdx(0);
  }, [activeSectors.length, totalPages]);

  const handleScoreSelect = (compositeKey: string, score: number) => {
    const bounded = Math.max(0, Math.min(5, Number(score)));
    setScoresByKey((prev) => ({ ...prev, [compositeKey]: bounded }));
  };

  const pageComplete =
    currentPage.length === 4 &&
    currentPage.every((q) => Number.isFinite(scoresByKey[makeKey(q)]));

  const allComplete =
    pages.length > 0 &&
    pages.every((grp) => grp.every((q) => Number.isFinite(scoresByKey[makeKey(q)])));

  const progress = totalPages > 0 ? Math.round(((pageIdx + 1) / totalPages) * 100) : 0;

  const goPrev = () => setPageIdx((i) => Math.max(0, i - 1));
  const goNext = () => {
    if (pageIdx < totalPages - 1 && pageComplete) setPageIdx((i) => i + 1);
  };

  const handleSubmitAnswers = async () => {
    if (!allComplete) return;
    setIsBusy(true);
    setError(null);
    try {
      const activeQuestions = pages.flat();

      const questionsWithCompositeId = activeQuestions.map((q) => ({
        ...q,
        id: makeKey(q),
      }));

      const responsesArray = activeQuestions.map((q) => ({
        question_id: makeKey(q),
        score: Number.isFinite(scoresByKey[makeKey(q)]) ? scoresByKey[makeKey(q)] : 3,
      }));

      const resp = await fetch("/api/questionnaire/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses: responsesArray,
          questions: questionsWithCompositeId,
          sector:
            selectedSector === "All Sectors"
              ? "All Sectors"
              : activeSectors.length > 1
              ? activeSectors.join(" + ")
              : activeSectors[0] || ctxSector || "General",
        }),
      });

      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok || payload?.success === false) {
        throw new Error(payload?.error || "Failed to calculate scorecard");
      }

      const result: SectorData | null =
        payload?.data && typeof payload.data === "object" ? payload.data : null;
      if (!result || !Object.keys(result).length) {
        throw new Error("No scorecard data returned");
      }

      sessionStorage.setItem("scorecard", JSON.stringify(result));
      router.push("/visualization");
    } catch (e: any) {
      setError(e?.message || "Failed to submit answers");
    } finally {
      setIsBusy(false);
    }
  };

  // Toggle logic (max two sectors). "All Sectors" resets to all.
  const onSectorClick = (sec: string) => {
    if (sec === "All Sectors") {
      setSelectedSector("All Sectors");
      setSelectedSectors([...SECTOR_ORDER]);
      return;
    }
    const s = canonicalSector(sec);
    setSelectedSectors((prev) => {
      let next = prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s];
      if (next.length > 2) {
        next = next.slice(-2); // keep the most recent two
      }
      if (next.length === 0) {
        setSelectedSector("All Sectors");
        return [...SECTOR_ORDER];
      }
      setSelectedSector(next.length === 1 ? next[0] : "Multiple");
      return next;
    });
  };

  const sectorLabel =
    selectedSector === "All Sectors"
      ? "All Sectors"
      : activeSectors.length > 1
      ? `${activeSectors[0]} + ${activeSectors[1]}`
      : activeSectors[0] || ctxSector || "General";

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">Interactive Questionnaire</h2>
          <p className="text-neutral text-sm">
            Sector: {sectorLabel} | {filtered.length} Questions
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

      {/* Sector filter */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-primary mb-2">Select Sector (max 2)</h3>
        <div className="flex flex-wrap gap-2">
          {sectors.map((sec) => {
            const isAll = sec === "All Sectors";
            const isActive = isAll
              ? selectedSector === "All Sectors"
              : activeSectors.includes(canonicalSector(sec)) && selectedSector !== "All Sectors";
            return (
              <button
                key={sec}
                onClick={() => onSectorClick(sec)}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive ? "bg-primary text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              >
                {sec}
              </button>
            );
          })}
        </div>
        {selectedSector !== "All Sectors" && activeSectors.length > 1 && (
          <p className="text-xs text-neutral mt-2">
            Showing sectors in order: {SECTOR_ORDER.filter((s) => activeSectors.includes(s)).join(" → ")}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 animate-shake" role="alert">
          {error}
        </div>
      )}

      {isBusy ? (
        <div className="text-center text-neutral">Loading questionnaire...</div>
      ) : pages.length === 0 ? (
        <div className="text-center text-neutral">
          No complete (4-dimension) cards available
          {selectedSector && selectedSector !== "All Sectors" ? ` for selection "${sectorLabel}"` : ""}.
        </div>
      ) : (
        <>
          <div className="text-center text-neutral text-sm mb-4">
            Page {pageIdx + 1} of {pages.length}
          </div>

          <QuestionCard
            questions={currentPage}
            selectedScores={scoresByKey}
            onScoreSelect={handleScoreSelect}
            scoreRubric={rubric}
          />

          <div className="flex justify-between mt-8 gap-4">
            <button
              onClick={goPrev}
              disabled={pageIdx === 0 || isBusy}
              className={`px-4 py-2 border border-gray-300 rounded-lg text-gray-600 transition-opacity ${
                pageIdx === 0 || isBusy ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
              }`}
            >
              Previous
            </button>

            {pageIdx < pages.length - 1 ? (
              <button
                onClick={goNext}
                disabled={!pageComplete || isBusy}
                className={`px-4 py-2 bg-primary text-white rounded-lg transition-opacity ${
                  !pageComplete || isBusy ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/90"
                }`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmitAnswers}
                disabled={!allComplete || isBusy}
                className={`px-4 py-2 bg-primary text-white rounded-lg transition-opacity ${
                  !allComplete || isBusy ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/90"
                }`}
              >
                Submit & View Results
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
