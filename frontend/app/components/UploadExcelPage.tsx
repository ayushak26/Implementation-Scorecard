// frontend/components/UploadExcelPage.tsx

"use client";

import React, { useContext, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { SDGContext } from "./SDGContext";

/* ============================ Helpers ============================ */
const isExcelFilename = (name?: string) =>
  !!name && /\.xlsx?$/i.test(name.trim());

const ensureExcelMime = (f: File): File => {
  const needsFix =
    !f.type ||
    f.type === "application/octet-stream" ||
    f.type === "binary/octet-stream";
  if (!needsFix) return f;

  const isXls = f.name.toLowerCase().endsWith(".xls");
  const mime = isXls
    ? "application/vnd.ms-excel"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  return new File([f], f.name, { type: mime, lastModified: f.lastModified });
};

/* ============================ Component ============================ */
export default function UploadExcelPage() {
  const context = useContext(SDGContext);
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!context) return null;

  const { file, setFile, setQuestions, setSector, reset } = context;

  /* -------------------- Handlers -------------------- */
  const handleFileChange = (f: File | null) => {
    setError(null);
    if (f && !isExcelFilename(f.name)) {
      setFile(null);
      setError("Please upload a valid Excel file (.xls or .xlsx).");
      return;
    }
    setFile(f);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer?.files?.[0] ?? null;
    if (dropped) handleFileChange(dropped);
  };

  const handleClick = () => fileInputRef.current?.click();

  const handleExcelUpload = async () => {
    if (!file) {
      setError("Please select an Excel file first.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }
    if (!isExcelFilename(file.name)) {
      setError("Please upload a valid Excel file (.xls or .xlsx).");
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      // Normalize MIME for strict backends
      const fixed = ensureExcelMime(file);

      const form = new FormData();
      // Send under BOTH keys to satisfy different server expectations
      form.append("file", fixed, fixed.name);
      form.append("excel_file", fixed, fixed.name);

      const resp = await fetch("/api/upload-excel", { method: "POST", body: form });
      let payload: any = {};
      try {
        payload = await resp.json();
      } catch {
        // if server didn't return JSON, fallback to generic error below
      }

      if (!resp.ok || payload?.success === false) {
        throw new Error(payload?.detail || payload?.error || `Upload failed (${resp.status})`);
      }

      const qs: Question[] = Array.isArray(payload?.questions) ? payload.questions : [];
      if (qs.length === 0) {
        throw new Error("No questions found in the uploaded Excel sheet.");
      }

      setQuestions(qs);
      setSector(String(payload?.sector || "General"));

      // Allow state propagation before navigation
      setTimeout(() => router.push("/form"), 100);
    } catch (e: any) {
      setError(e?.message || "Failed to upload Excel.");
    } finally {
      setIsBusy(false);
    }
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary">Upload Your Excel Workbook</h2>
        <p className="text-neutral mt-2">
          Drag and drop or select your questionnaire Excel file to start the assessment.
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          dragActive ? "border-secondary bg-green-50" : file ? "border-secondary" : "border-gray-300"
        } hover:border-primary hover:bg-gray-50 cursor-pointer`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleClick()}
        aria-label="Upload Excel file"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          className="hidden"
        />

        <div className="flex flex-col items-center">
          {file ? (
            <p className="text-lg font-semibold text-secondary">{file.name}</p>
          ) : (
            <>
              <svg
                className="w-12 h-12 text-neutral mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-gray-600">Drag your Excel file here or click to browse</p>
            </>
          )}
          <p className="text-sm text-neutral mt-2">Accepted formats: .xlsx, .xls | Max size: 10MB</p>
        </div>
      </div>

      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mt-4 animate-shake"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="flex justify-end gap-4 mt-6">
        <button
          onClick={reset}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-all duration-300"
          type="button"
        >
          Reset
        </button>
        <button
          onClick={handleExcelUpload}
          disabled={!file || isBusy}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-gray-800 disabled:opacity-60 transition-all duration-300 flex items-center gap-2"
          type="button"
        >
          {isBusy ? (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
          ) : (
            "Upload & Proceed"
          )}
        </button>
      </div>
    </div>
  );
}

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
