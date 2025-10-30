// frontend/components/UploadExcelPage.tsx
"use client";

import React, { useContext, useState, useRef } from "react";
import { useRouter } from "next/navigation";
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

export default function UploadExcelPage() {
  const context = useContext(SDGContext);
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!context) return null;

  const { file, setFile, setQuestions, setSector, setSelectedSector, reset } = context;

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
    if (!file || isBusy) {
      setError(!file ? "Please select an Excel file first." : "Please wait for the current upload to complete.");
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
      const fixed = ensureExcelMime(file);
      const form = new FormData();
      form.append("file", fixed, fixed.name);

      // ✅ Direct call to FastAPI - no Next.js API route needed
      // Development: next.config.js proxies to localhost:8000
      // Production: vercel.json routes to FastAPI
      const resp = await fetch("/api/upload-excel", {
        method: "POST",
        body: form,
      });

      // ✅ Better error handling
      if (!resp.ok) {
        const errorText = await resp.text();
        let errorMsg = "Upload failed";
        
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData?.detail || errorData?.error || errorMsg;
        } catch {
          errorMsg = errorText || errorMsg;
        }
        
        throw new Error(errorMsg);
      }

      let payload: any = {};
      try {
        payload = await resp.json();
      } catch {
        throw new Error("Failed to parse server response.");
      }

      // Check for success flag
      if (payload?.success === false) {
        throw new Error(payload?.error || payload?.detail || "Upload failed");
      }

      let qs: Question[] = Array.isArray(payload?.questions) ? payload.questions : [];
      
      if (qs.length === 0) {
        throw new Error(
          payload?.detail || 
          "No questions found in the uploaded Excel file. Ensure the file contains sheets with valid headers: sdg_target, sustainability_dimension, kpi, question, scoring, source, notes, status, comment."
        );
      }

      console.log(`✅ Successfully uploaded ${qs.length} questions from sector: ${payload?.sector}`);

      setQuestions(qs);
      setSector(String(payload?.sector || "General"));
      setSelectedSector(""); // Reset sector filter for FormPage

      // Navigate to form page
      setTimeout(() => router.push("/form"), 100);
    } catch (e) {
      console.error("Upload error:", e);
      setError((e as Error).message || "Failed to upload Excel. Please ensure the file is correctly formatted.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary">Upload Your Excel Workbook</h2>
        <p className="text-neutral mt-2">
          Drag and drop or select your questionnaire Excel file to start the assessment.
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive ? "border-secondary bg-green-50" : file ? "border-secondary" : "border-gray-300"
        } cursor-pointer`}
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
          disabled={isBusy}
        />
        <div className="flex flex-col items-center">
          {file ? (
            <>
              <svg
                className="w-12 h-12 text-secondary mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg font-semibold text-secondary">{file.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </>
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
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Upload Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-4 mt-6">
        <button
          onClick={reset}
          disabled={isBusy}
          className={`px-4 py-2 border border-gray-300 rounded-lg text-gray-600 ${
            isBusy ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
          }`}
          type="button"
        >
          Reset
        </button>
        <button
          onClick={handleExcelUpload}
          disabled={isBusy || !file}
          className={`px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2 transition-opacity ${
            isBusy || !file ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
          }`}
        >
          {isBusy && (
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
          )}
          {isBusy ? "Uploading..." : "Upload & Proceed"}
        </button>
      </div>
    </div>
  );
}