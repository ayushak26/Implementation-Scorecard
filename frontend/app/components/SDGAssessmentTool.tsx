"use client";

import React, { useMemo, useState } from "react";
import SdgGridRouletteVisualization from "./scorecard-viz";

/* ---------------- Types ---------------- */

type SustainabilityDimension =
  | "Economic Performance"
  | "Circular Performance"
  | "Environmental Performance"
  | "Social Performance";

export type QuestionnaireRow = {
  sdg_number: number | null;
  sustainability_dimension: SustainabilityDimension | null;
  sector: string | null;
  score: number | null;
  sdg_description?: string | null;
  sdg_target?: string | null;
  kpi?: string | null;
  question?: string | null;
  score_description?: string | null;
  source?: string | null;
  notes?: string | null;
  status?: string | null;
  comment?: string | null;
};

type SectorData = Record<string, { rows: QuestionnaireRow[] }>;

/* ---------------- Component ---------------- */

export default function SDGAssessmentTool() {
  const [data, setData] = useState<SectorData | null>(null);
  const [selectedSectorKey, setSelectedSectorKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Excel upload handler (uses Next.js proxy /api/upload-excel)
  const handleExcelUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-excel", { method: "POST", body: formData });

      const rawText = await res.text();
      let payload: any = {};
      try { payload = JSON.parse(rawText); } catch {}
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.detail || `Upload failed (HTTP ${res.status})`);
      }

      const adapted = adaptUploadResponse(payload.data);
      const normalized = normalizeDataset(adapted);

      setData(normalized);
      setSelectedSectorKey(Object.keys(normalized)[0] ?? null);
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(error?.message || "Failed to process file");
    } finally {
      setIsProcessing(false);
    }
  };

  // Questionnaire submit handler
  const handleQuestionnaireSubmit = async (sector: string, rows: Partial<QuestionnaireRow>[]) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sector, rows }),
      });

      const rawText = await res.text();
      let payload: any = {};
      try { payload = JSON.parse(rawText); } catch {}
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.detail || `Submission failed (HTTP ${res.status})`);
      }

      const adapted = adaptUploadResponse(payload.data);
      const normalized = normalizeDataset(adapted);

      setData(normalized);
      setSelectedSectorKey(Object.keys(normalized)[0] ?? null);
    } catch (error: any) {
      console.error("Submit error:", error);
      alert(error?.message || "Failed to submit questionnaire");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      {!data ? (
        <DataInputSection
          onExcelUpload={handleExcelUpload}
          onQuestionnaireSubmit={handleQuestionnaireSubmit}
          isProcessing={isProcessing}
        />
      ) : (
        <VisualizationSection
          data={data}
          selectedSectorKey={selectedSectorKey}
          onSectorChange={setSelectedSectorKey}
          onReset={() => {
            setData(null);
            setSelectedSectorKey(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Data input section ---------------- */

function DataInputSection({
  onExcelUpload,
  onQuestionnaireSubmit,
  isProcessing,
}: {
  onExcelUpload: (file: File) => Promise<void>;
  onQuestionnaireSubmit: (sector: string, rows: Partial<QuestionnaireRow>[]) => Promise<void>;
  isProcessing: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"upload" | "form">("form");

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">SDG Assessment Tool</h1>

      <div className="bg-white rounded-lg shadow-lg">
        <div className="flex border-b">
          <button
            className={`flex-1 py-4 px-6 ${activeTab === "upload" ? "bg-blue-50 border-b-2 border-blue-500" : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            Upload Excel
          </button>
          <button
            className={`flex-1 py-4 px-6 ${activeTab === "form" ? "bg-blue-50 border-b-2 border-blue-500" : ""}`}
            onClick={() => setActiveTab("form")}
          >
            Fill Questionnaire
          </button>
        </div>

        <div className="p-8">
          {activeTab === "upload" ? (
            <ExcelUploadTab onUpload={onExcelUpload} isProcessing={isProcessing} />
          ) : (
            <QuestionnaireFormTab onSubmit={onQuestionnaireSubmit} isProcessing={isProcessing} />
          )}
        </div>
      </div>
    </div>
  );
}

function ExcelUploadTab({
  onUpload,
  isProcessing,
}: {
  onUpload: (file: File) => Promise<void>;
  isProcessing: boolean;
}) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onUpload(f);
  };
  return (
    <div className="space-y-4">
      <input
        type="file"
        accept=".xlsx,.xlsm,.xltx,.xltm"
        onChange={onChange}
        disabled={isProcessing}
        className="block"
      />
      <p className="text-sm text-slate-600">
        Accepted: .xlsx / .xlsm / .xltx / .xltm
      </p>
    </div>
  );
}

function QuestionnaireFormTab({
  onSubmit,
  isProcessing,
}: {
  onSubmit: (sector: string, rows: Partial<QuestionnaireRow>[]) => Promise<void>;
  isProcessing: boolean;
}) {
  const [sector, setSector] = useState("Textiles");
  const [questions, setQuestions] = useState<Partial<QuestionnaireRow>[]>([
    {
      sdg_number: null,
      sustainability_dimension: null,
      score: null,
      question: "",
    },
  ]);

  const sustainabilityDimensions: SustainabilityDimension[] = [
    "Economic Performance",
    "Circular Performance",
    "Environmental Performance",
    "Social Performance",
  ];

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        sdg_number: null,
        sustainability_dimension: null,
        score: null,
        question: "",
      },
    ]);
  };

  const updateQuestion = (index: number, field: keyof QuestionnaireRow, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const submit = () => {
    const validQuestions = questions.filter(
      (q) =>
        q.sdg_number != null &&
        q.sustainability_dimension != null &&
        q.score != null &&
        q.question?.trim()
    );
    if (validQuestions.length === 0) {
      alert("Please add at least one valid question with all required fields.");
      return;
    }
    onSubmit(sector, validQuestions);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <label className="text-sm w-16">Sector</label>
        <input
          className="border rounded px-2 py-1 text-sm flex-1"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Questions</h3>
        {questions.map((q, index) => (
          <div key={index} className="border p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm w-24">SDG Number</label>
              <input
                type="number"
                min="1"
                max="17"
                className="border rounded px-2 py-1 text-sm flex-1"
                value={q.sdg_number ?? ""}
                onChange={(e) => updateQuestion(index, "sdg_number", parseInt(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm w-24">Dimension</label>
              <select
                className="border rounded px-2 py-1 text-sm flex-1"
                value={q.sustainability_dimension ?? ""}
                onChange={(e) => updateQuestion(index, "sustainability_dimension", e.target.value as SustainabilityDimension)}
              >
                <option value="">Select Dimension</option>
                {sustainabilityDimensions.map((dim) => (
                  <option key={dim} value={dim}>
                    {dim}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm w-24">Score</label>
              <input
                type="number"
                min="0"
                max="5"
                className="border rounded px-2 py-1 text-sm flex-1"
                value={q.score ?? ""}
                onChange={(e) => updateQuestion(index, "score", parseInt(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm w-24">Question</label>
              <input
                className="border rounded px-2 py-1 text-sm flex-1"
                value={q.question ?? ""}
                onChange={(e) => updateQuestion(index, "question", e.target.value)}
              />
            </div>
            <button
              onClick={() => removeQuestion(index)}
              className="text-red-600 text-sm hover:underline"
            >
              Remove Question
            </button>
          </div>
        ))}
        <button
          onClick={addQuestion}
          className="px-3 py-2 rounded bg-blue-600 text-white text-sm"
        >
          Add Question
        </button>
      </div>

      <button
        onClick={submit}
        disabled={isProcessing}
        className="px-3 py-2 rounded bg-slate-900 text-white"
      >
        {isProcessing ? "Submitting…" : "Visualize"}
      </button>
    </div>
  );
}

/* ---------------- Visualization section ---------------- */

function VisualizationSection({
  data,
  selectedSectorKey,
  onSectorChange,
  onReset,
}: {
  data: SectorData;
  selectedSectorKey: string | null;
  onSectorChange: (k: string) => void;
  onReset: () => void;
}) {
  const sectorKeys = useMemo(() => Object.keys(data || {}), [data]);
  const sectorLabel = useMemo(
    () => (selectedSectorKey ? selectedSectorKey.replace(/_/g, " ") : ""),
    [selectedSectorKey]
  );

  const rows = useMemo(() => {
    if (!selectedSectorKey) return [];
    const base = data[selectedSectorKey]?.rows ?? [];
    return base.map((r) => ({
      ...r,
      sector: r.sector ?? sectorLabel,
    })) as QuestionnaireRow[];
  }, [data, selectedSectorKey, sectorLabel]);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {sectorKeys.map((k) => {
            const active = k === selectedSectorKey;
            const label = k.replace(/_/g, " ");
            return (
              <button
                key={k}
                onClick={() => onSectorChange(k)}
                className={`px-3 py-1.5 rounded border text-sm ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button onClick={onReset} className="px-3 py-1.5 rounded bg-rose-600 text-white text-sm">
          Reset
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        {rows.length ? (
          <SdgGridRouletteVisualization rows={rows} sector={sectorLabel || "General"} />
        ) : (
          <p className="text-sm text-slate-600">No data for selected sector.</p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Normalization helpers (client-side) ---------------- */

function adaptUploadResponse(data: any): SectorData {
  if (!data || typeof data !== "object") return {};
  const looksA = Object.values<any>(data).some((v) => v && typeof v === "object" && Array.isArray(v.rows));
  if (looksA) return data as SectorData;

  const out: SectorData = {};
  for (const [k, v] of Object.entries<any>(data)) {
    out[k] = { rows: Array.isArray(v) ? v : [] };
  }
  return out;
}

function sectorLabelFromKey(key: string): string {
  const t = key.toLowerCase();
  if (t.includes("textile")) return "Textiles";
  if (t.includes("fertil")) return "Fertilizers";
  return key.replace(/_/g, " ");
}

function normalizeRow(r: any, sectorLabel: string): QuestionnaireRow {
  const dimRaw = (r?.sustainability_dimension ?? "").toString().toLowerCase();
  const normalizedDim: SustainabilityDimension | null =
    dimRaw.startsWith("econ") ? "Economic Performance" :
    dimRaw.startsWith("circ") ? "Circular Performance" :
    dimRaw.startsWith("env")  ? "Environmental Performance" :
    dimRaw.startsWith("soc")  ? "Social Performance" : null;

  const sdgNum = r?.sdg_number == null
    ? null
    : Number(String(r.sdg_number).match(/\d+/)?.[0] ?? r.sdg_number);

  const scoreNum = r?.score == null ? null : Number(r.score);

  return {
    sdg_number: Number.isFinite(sdgNum) ? Math.min(17, Math.max(1, sdgNum)) : null,
    sustainability_dimension: normalizedDim,
    sector: r?.sector ?? sectorLabel,
    score: Number.isFinite(scoreNum) ? Math.min(5, Math.max(0, scoreNum)) : null,
    sdg_description: r?.sdg_description ?? null,
    sdg_target: r?.sdg_target ?? null,
    kpi: r?.kpi ?? null,
    question: r?.question ?? null,
    score_description: r?.score_description ?? null,
    source: r?.source ?? null,
    notes: r?.notes ?? null,
    status: r?.status ?? null,
    comment: r?.comment ?? null,
  };
}

function normalizeDataset(data: SectorData): SectorData {
  const out: SectorData = {};
  for (const [key, obj] of Object.entries(data)) {
    const label = sectorLabelFromKey(key);
    const rows = (obj?.rows ?? []).map((r) => normalizeRow(r, label))
      .filter((r) => r.sustainability_dimension && r.score !== null);
    out[key] = { rows };
  }
  return out;
}