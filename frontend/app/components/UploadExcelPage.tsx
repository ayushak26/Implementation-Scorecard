// frontend/components/UploadExcelPage.tsx
"use client";

import React, { useContext, useState, useRef, useEffect } from "react";
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [currentUpload, setCurrentUpload] = useState<{
    filename: string;
    timestamp: string;
    questionCount: number;
    sector: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!context) return null;

  const { file, setFile, setQuestions, setSector, setSelectedSector, clearAll } = context;

  // Check for existing upload on mount
  useEffect(() => {
    loadCurrentUpload();
  }, []);

  const loadCurrentUpload = () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("uploadedQuestions");
      const filename = localStorage.getItem("uploadedFilename");
      const timestamp = localStorage.getItem("uploadedTimestamp");
      const sector = localStorage.getItem("uploadedSector");
      
      if (stored) {
        try {
          const questions = JSON.parse(stored);
          setCurrentUpload({
            filename: filename || "Unknown file",
            timestamp: timestamp || "",
            questionCount: Array.isArray(questions) ? questions.length : 0,
            sector: sector || "General"
          });
          console.log(`📂 Current upload: ${filename} (${questions.length} questions)`);
        } catch (e) {
          console.warn("Failed to parse existing upload:", e);
          // Clear corrupted data
          clearAll();
        }
      } else {
        console.log("📂 No uploaded Excel found - will use default");
      }
    }
  };

  const handleFileChange = (f: File | null) => {
    setError(null);
    setSuccessMessage(null);
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

  const handleClearCurrentUpload = () => {
    if (!confirm("Clear the current uploaded Excel? The app will use the default Excel questionnaire instead.")) {
      return;
    }

    console.log("🗑️ Clearing current uploaded Excel...");
    
    // Use clearAll to remove all uploaded data
    clearAll();
    
    // Update UI state
    setCurrentUpload(null);
    setFile(null);
    setSuccessMessage("Uploaded Excel cleared. The app will now use the default Excel questionnaire.");
  };

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
    setSuccessMessage(null);

    try {
      const fixed = ensureExcelMime(file);
      const form = new FormData();
      form.append("file", fixed, fixed.name);

      console.log(`📤 Uploading: ${file.name}`);
      if (currentUpload) {
        console.log(`🔄 This will replace: ${currentUpload.filename}`);
      }

      const resp = await fetch("/api/upload-excel", {
        method: "POST",
        body: form,
      });

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

      if (payload?.success === false) {
        throw new Error(payload?.error || payload?.detail || "Upload failed");
      }

      let qs: Question[] = Array.isArray(payload?.questions) ? payload.questions : [];
      
      if (qs.length === 0) {
        throw new Error(
          payload?.detail || 
          "No questions found in the uploaded Excel file."
        );
      }

      console.log(`✅ Upload successful: ${qs.length} questions from ${payload?.sector}`);

      // ⚡ AUTOMATIC REPLACEMENT: Clear old, save new
      if (typeof window !== "undefined") {
        // Step 1: Remove previous upload (if any)
        localStorage.removeItem("uploadedQuestions");
        localStorage.removeItem("uploadedSector");
        localStorage.removeItem("uploadedTimestamp");
        localStorage.removeItem("uploadedFilename");
        
        if (currentUpload) {
          console.log(`🗑️ Removed previous: ${currentUpload.filename}`);
        }
        
        // Step 2: Save new upload
        localStorage.setItem("uploadedQuestions", JSON.stringify(qs));
        localStorage.setItem("uploadedSector", payload?.sector || "General");
        localStorage.setItem("uploadedTimestamp", new Date().toISOString());
        localStorage.setItem("uploadedFilename", file.name);
        
        console.log(`💾 Saved new upload: ${file.name}`);
      }

      // Update context
      setQuestions(qs);
      setSector(String(payload?.sector || "General"));
      setSelectedSector("");

      // Update UI state
      setCurrentUpload({
        filename: file.name,
        timestamp: new Date().toISOString(),
        questionCount: qs.length,
        sector: payload?.sector || "General"
      });

      // Show success message
      const action = currentUpload ? "replaced and uploaded" : "uploaded";
      setSuccessMessage(`Successfully ${action} ${qs.length} questions from ${file.name}!`);

      // Navigate to form page after short delay
      setTimeout(() => {
        router.push("/sector-picker");
      }, 1500);
      
    } catch (e) {
      console.error("Upload error:", e);
      setError((e as Error).message || "Failed to upload Excel.");
    } finally {
      setIsBusy(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary">Upload Your Excel Workbook</h2>
        <p className="text-neutral mt-2">
          Drag and drop or select your questionnaire Excel file to start the assessment.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          💡 Your latest uploaded file will be used for all assessments. New uploads automatically replace the previous one.
        </p>
      </div>

      {/* Currently Using Indicator */}
      {currentUpload && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-blue-900">📄 Currently Using</p>
                <p className="text-sm text-blue-700 mt-1">
                  <span className="font-medium">{currentUpload.filename}</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {currentUpload.questionCount} questions • {currentUpload.sector} • Uploaded {formatTimestamp(currentUpload.timestamp)}
                </p>
              </div>
            </div>
            <button
              onClick={handleClearCurrentUpload}
              disabled={isBusy}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              title="Clear and use default Excel"
            >
              Clear Upload
            </button>
          </div>
        </div>
      )}

      {!currentUpload && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-gray-900">📄 Currently Using</p>
              <p className="text-sm text-gray-600 mt-1">Default Excel Questionnaire</p>
              <p className="text-xs text-gray-500 mt-1">Upload a file to use your own questionnaire</p>
            </div>
          </div>
        </div>
      )}

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
              {currentUpload && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ This will replace: {currentUpload.filename}
                </p>
              )}
            </>
          ) : (
            <>
              <svg
                className="w-12 h-12 text-neutral mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-gray-600">
                {currentUpload ? "Upload a new Excel file to replace current" : "Drag your Excel file here or click to browse"}
              </p>
            </>
          )}
          <p className="text-sm text-neutral mt-2">Accepted formats: .xlsx, .xls | Max size: 10MB</p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 mt-4 animate-fadeIn">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Success!</p>
              <p className="text-sm">{successMessage}</p>
              <p className="text-xs mt-1">Redirecting to questionnaire...</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mt-4 animate-shake">
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
          onClick={() => setFile(null)}
          disabled={isBusy || !file}
          className={`px-4 py-2 border border-gray-300 rounded-lg text-gray-600 ${
            isBusy || !file ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
          }`}
          type="button"
        >
          Clear Selection
        </button>
        <button
          onClick={handleExcelUpload}
          disabled={isBusy || !file}
          className={`px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2 transition-opacity ${
            isBusy || !file ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
          }`}
        >
          {isBusy && (
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {isBusy ? "Uploading..." : currentUpload ? "Replace & Upload" : "Upload & Proceed"}
        </button>
      </div>
    </div>
  );
}