// app/visualization/error.tsx
"use client";
export default function Error({ error }: { error: Error }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 m-6">
      {error.message || "Something went wrong rendering the visualization."}
    </div>
  );
}
