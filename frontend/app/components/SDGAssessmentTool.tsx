"use client";

import React, { useEffect, useMemo, useState } from "react";
import SdgGridRouletteVisualization from "./scorecard-viz";
import QuestionCard from "./QuestionCard";

type QuestionnaireRow = {
  sdg_number: number | null;
  sdg_description?: string | null;
  sdg_target?: string | null;
  sustainability_dimension?: string | null;
  kpi?: string | null;
  question?: string | null;
  sector?: string | null;
  score?: number | null;
  score_description?: string | null;
  source?: string | null;
  notes?: string | null;
  status?: string | null;
  comment?: string | null;
};

type SectorRows = { rows: QuestionnaireRow[] };
type SectorData = Record<string, SectorRows>;

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

type Step = "upload" | "questionnaire" | "results";

export default function SDGAssessmentTool() {
  // Wizard state
  const [step, setStep] = useState<Step>("upload");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload + questionnaire state
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sector, setSector] = useState<string>("");

  // Answers
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [currentIdx, setCurrentIdx] = useState(0);

  // Results
  const [data, setData] = useState<SectorData | null>(null);
  const [selectedSectorKey, setSelectedSectorKey] = useState<string | null>(null);

  const totalQuestions = questions.length;
  const currentQuestion = totalQuestions > 0 ? questions[currentIdx] : null;

  const sectorKeys = useMemo(() => (data ? Object.keys(data) : []), [data]);

  const activeRows: QuestionnaireRow[] = useMemo(() => {
    if (!data || !selectedSectorKey) return [];
    const bucket = data[selectedSectorKey];
    return Array.isArray(bucket?.rows) ? bucket.rows : [];
  }, [data, selectedSectorKey]);

  // Smooth scroll to top on step change for better UX
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      /* no-op */
    }
  }, [step]);

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  const handleExcelUpload = async () => {
    if (!file) {
      setError("Please choose an Excel file first.");
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);

      const resp = await fetch("/api/upload-excel", { method: "POST", body: form });
      const payload = await resp.json();

      if (!resp.ok || !payload?.success) {
        throw new Error(payload?.error || "Upload failed");
      }
      const qs: Question[] = Array.isArray(payload?.questions) ? payload.questions : [];
      if (qs.length === 0) throw new Error("No questions found in the uploaded Excel sheet.");

      setQuestions(qs);
      setSector(String(payload?.sector || "General"));
      setResponses({});
      setCurrentIdx(0);
      setStep("questionnaire");
    } catch (e: any) {
      setError(e?.message || "Failed to upload Excel.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleScoreSelect = (score: number) => {
    if (!currentQuestion) return;
    setResponses((prev) => ({ ...prev, [currentQuestion.id]: score }));
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

      const body = JSON.stringify({
        responses: responsesArray,
        questions,
      });

      const resp = await fetch("/api/questionnaire/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const payload = await resp.json();

      if (!resp.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to calculate scorecard.");
      }

      const result: SectorData | null =
        payload?.data && typeof payload.data === "object" ? payload.data : null;
      if (!result || Object.keys(result).length === 0) {
        throw new Error("No scorecard data returned.");
      }

      setData(result);
      const keys = Object.keys(result);
      setSelectedSectorKey(keys[0] || null);
      setStep("results");
    } catch (e: any) {
      setError(e?.message || "Failed to submit answers.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleReset = () => {
    setError(null);
    setIsBusy(false);
    setFile(null);
    setQuestions([]);
    setSector("");
    setResponses({});
    setCurrentIdx(0);
    setData(null);
    setSelectedSectorKey(null);
    setStep("upload");
  };

  // UI Sections
  const Stepper = () => {
    const steps: { key: Step; label: string }[] = [
      { key: "upload", label: "Upload" },
      { key: "questionnaire", label: "Answer" },
      { key: "results", label: "Results" },
    ];
    const idx = steps.findIndex((s) => s.key === step);

    return (
      <div className="stepper">
        {steps.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <div key={s.key} className="step">
              <div className={`step-dot ${done ? "done" : active ? "active" : ""}`}>
                {done ? "✓" : i + 1}
              </div>
              <div className={`step-label ${active ? "lbl-active" : ""}`}>{s.label}</div>
              {i < steps.length - 1 && <div className={`step-line ${i < idx ? "line-done" : ""}`} />}
            </div>
          );
        })}
      </div>
    );
  };

  const Legend = () => (
    <div className="legend">
      <div className="legend-title">Legend</div>
      <div className="legend-row">
        <span className="legend-dot" style={{ background: "#F44336" }} />
        <span>Economic</span>
      </div>
      <div className="legend-row">
        <span className="legend-dot" style={{ background: "#FF9800" }} />
        <span>Circular</span>
      </div>
      <div className="legend-row">
        <span className="legend-dot" style={{ background: "#4CAF50" }} />
        <span>Environmental</span>
      </div>
      <div className="legend-row">
        <span className="legend-dot" style={{ background: "#2196F3" }} />
        <span>Social</span>
      </div>
      <div className="legend-sub">Scores 0–5 are drawn from center outward as rings.</div>
    </div>
  );

  const UploadCard = () => (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">Upload Excel</h2>
        <p className="card-sub">Upload a questionnaire workbook to begin.</p>
      </div>

      <div className="form-item">
        <label className="label">Excel file</label>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="file" />
        <div className="hint">Accepted: .xlsx, .xls</div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="row end gap">
        <button onClick={handleReset} className="btn btn-ghost">
          Reset
        </button>
        <button onClick={handleExcelUpload} disabled={!file || isBusy} className="btn btn-primary">
          {isBusy ? "Uploading..." : "Upload & Start"}
        </button>
      </div>
    </div>
  );

  const QuestionnaireCard = () => {
    const selectedScore = currentQuestion ? responses[currentQuestion.id] : undefined;
    const canPrev = currentIdx > 0;
    const canNext = currentIdx < totalQuestions - 1;
    const allAnswered = totalQuestions > 0 && questions.every((q) => Number.isFinite(responses[q.id]));
    const pct = totalQuestions > 0 ? Math.round(((currentIdx + 1) / totalQuestions) * 100) : 0;

    return (
      <div className="card">
        <div className="card-head row between">
          <div>
            <h2 className="card-title">Questionnaire</h2>
            <p className="card-sub">Sector: {sector || "General"}</p>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="muted">Question {currentIdx + 1} of {totalQuestions}</div>

        <div className="qcard">
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
        </div>

        <div className="row between mt">
          <button onClick={goPrev} disabled={!canPrev || isBusy} className="btn btn-secondary">
            Previous
          </button>
          {canNext ? (
            <button
              onClick={goNext}
              disabled={!Number.isFinite(selectedScore) || isBusy}
              className="btn btn-primary"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmitAnswers}
              disabled={!allAnswered || isBusy}
              className="btn btn-primary"
            >
              {isBusy ? "Submitting..." : "Submit Assessment"}
            </button>
          )}
        </div>
      </div>
    );
  };

  const ResultsCard = () => (
    <div className="card">
      <div className="card-head row wrap between">
        <div>
          <h2 className="card-title">Results</h2>
          <p className="card-sub">Explore your SDG scorecard by sector.</p>
        </div>
        <div className="row wrap gap">
          {sectorKeys.map((key) => (
            <button
              key={key}
              onClick={() => setSelectedSectorKey(key)}
              className={`pill ${selectedSectorKey === key ? "pill-active" : ""}`}
            >
              {key}
            </button>
          ))}
          <button onClick={handleReset} className="btn btn-ghost">Start over</button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="grid3">
        <Legend />

        <div className="viz">
          {activeRows.length > 0 ? (
            <SdgGridRouletteVisualization rows={activeRows as any} sector={selectedSectorKey || ""} />
          ) : (
            <div className="empty">No data for selected sector.</div>
          )}
        </div>

        <div className="panel">
          <div className="panel-title">Tips</div>
          <ul className="tips">
            <li>Hover cells to see SDG and dimension details.</li>
            <li>Darker shades indicate higher scores.</li>
            <li>Use the sector chips above to switch datasets.</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="wrap">
      <header className="top">
        <h1 className="title">SDG Assessment Tool</h1>
        <p className="sub">
          Upload your workbook, answer the questions, and view a sector scorecard.
        </p>
        <Stepper />
      </header>

      {step === "upload" && <UploadCard />}
      {step === "questionnaire" && <QuestionnaireCard />}
      {step === "results" && <ResultsCard />}

      <style jsx>{`
        /* Page */
        .wrap { max-width: 1100px; margin: 0 auto; padding: 24px; }
        .top { margin-bottom: 14px; }
        .title { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
        .sub { margin: 6px 0 0; color: #475569; font-size: 14px; }

        /* Stepper */
        .stepper { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; margin-top: 12px; }
        .step { display: grid; grid-template-columns: auto 1fr; align-items: center; position: relative; }
        .step-dot { width: 26px; height: 26px; border-radius: 50%; background: #e2e8f0; color: #0f172a; display: grid; place-items: center; font-size: 13px; font-weight: 600; }
        .step-dot.active { background: #0f172a; color: #fff; }
        .step-dot.done { background: #16a34a; color: #fff; }
        .step-label { margin-left: 8px; color: #475569; font-size: 13px; }
        .lbl-active { color: #0f172a; font-weight: 600; }
        .step-line { position: absolute; height: 3px; background: #e2e8f0; left: calc(26px + 8px); right: 10px; top: 12px; border-radius: 999px; }
        .line-done { background: #16a34a; }

        /* Cards */
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); padding: 18px; margin-top: 14px; }
        .card-head { margin-bottom: 10px; }
        .card-title { margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; }
        .card-sub { margin: 4px 0 0; color: #64748b; font-size: 13px; }

        /* Form */
        .form-item { margin-top: 10px; }
        .label { display: block; font-size: 14px; color: #334155; margin-bottom: 6px; }
        .file { width: 100%; font-size: 14px; }
        .hint { font-size: 12px; color: #64748b; margin-top: 6px; }

        /* Alerts, text */
        .alert { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 8px; padding: 10px; margin: 10px 0; font-size: 14px; }
        .muted { color: #475569; font-size: 14px; margin: 8px 0; }

        /* Buttons */
        .btn { display: inline-flex; align-items: center; justify-content: center; font-size: 14px; padding: 8px 14px; border-radius: 10px; border: 1px solid transparent; cursor: pointer; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-primary { background: #0f172a; color: #fff; }
        .btn-secondary { background: #fff; color: #334155; border-color: #cbd5e1; }
        .btn-ghost { background: transparent; color: #334155; border: 1px dashed #cbd5e1; }

        /* Layout helpers */
        .row { display: flex; align-items: center; gap: 10px; }
        .between { justify-content: space-between; }
        .end { justify-content: flex-end; }
        .wrap { flex-wrap: wrap; }
        .gap { gap: 8px; }
        .mt { margin-top: 12px; }

        /* Progress */
        .progress { width: 220px; height: 10px; background: #f1f5f9; border-radius: 999px; overflow: hidden; border: 1px solid #e2e8f0; }
        .progress-bar { height: 100%; background: linear-gradient(90deg, #0f172a, #334155); }

        /* Results layout */
        .grid3 { display: grid; grid-template-columns: 230px 1fr 260px; gap: 12px; }
        @media (max-width: 1000px) {
          .grid3 { grid-template-columns: 1fr; }
        }
        .legend { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
        .legend-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
        .legend-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; color: #334155; font-size: 13px; }
        .legend-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
        .legend-sub { color: #64748b; font-size: 12px; margin-top: 8px; }

        .viz { min-height: 620px; display: grid; place-items: center; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px; background: #fff; }
        .empty { color: #475569; font-size: 14px; }

        .panel { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
        .panel-title { font-size: 14px; font-weight: 700; color: #0f172a; }
        .tips { margin: 8px 0 0; padding-left: 16px; color: #334155; font-size: 13px; }
        .tips li { margin: 6px 0; }

        /* Pills */
        .pill { padding: 6px 12px; font-size: 13px; border-radius: 9999px; border: 1px solid #cbd5e1; background: #fff; color: #334155; }
        .pill-active { background: #0f172a; color: #fff; border-color: #0f172a; }
      `}</style>
    </div>
  );
}
