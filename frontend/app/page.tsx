"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if there's an uploaded Excel
    const hasUpload = typeof window !== "undefined" && 
                      localStorage.getItem("uploadedQuestions");
    
    if (hasUpload) {
      // Has upload → Go to sector picker
      console.log("📂 Found uploaded Excel, redirecting to sector picker");
      router.push("/sector-picker");
    } else {
      // No upload → Show upload page or landing
      console.log("📂 No uploaded Excel, showing upload page");
      router.push("/upload-excel");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}