// adapters.ts
import type { QuestionnaireRow } from "./scorecard-viz";

// Accepts both shapes: 
// A) { textile: [...], fertilizer: [...] } 
// B) { "Textiles": { rows: [...] }, "Fertilizers": { rows: [...] } }
export function adaptUploadResponse(
  data: any
): Record<string, { rows: QuestionnaireRow[] }> {
  // Shape B?
  const looksLikeB = Object.values(data ?? {}).some(
    (v: any) => v && typeof v === "object" && Array.isArray(v.rows)
  );
  if (looksLikeB) return data as Record<string, { rows: QuestionnaireRow[] }>;

  // Shape A -> wrap each array into { rows }
  const out: Record<string, { rows: QuestionnaireRow[] }> = {};
  for (const [k, v] of Object.entries<any>(data ?? {})) {
    out[k] = { rows: Array.isArray(v) ? v : [] };
  }
  return out;
}

// Canonicalize sector label from a key (e.g., "textile" -> "Textiles")
export function sectorLabelFromKey(key: string): string {
  const t = key.toLowerCase();
  if (t.includes("textile")) return "Textiles";
  if (t.includes("fertil")) return "Fertilizers";
  return key.replace(/_/g, " ");
}

// Normalize one row (numbers + dimensions + sector)
export function normalizeRow(
  r: QuestionnaireRow,
  sectorLabel: string
): QuestionnaireRow {
  // sdg_number: allow "SDG 3" or "3"
  const sdgNum = r?.sdg_number == null
    ? null
    : Number(String(r.sdg_number).match(/\d+/)?.[0] ?? r.sdg_number);

  // score -> number or null
  const score = r?.score == null ? null : Number(r.score);

  const dimRaw = (r?.sustainability_dimension ?? "").toString().toLowerCase();
  const normalizedDim =
    dimRaw.startsWith("econ") ? "Economic Performance" :
    dimRaw.startsWith("circ") ? "Circular Performance" :
    dimRaw.startsWith("env")  ? "Environmental Performance" :
    dimRaw.startsWith("soc")  ? "Social Performance" :
    r?.sustainability_dimension ?? null;

  return {
    ...r,
    sdg_number: sdgNum,
    score,
    sector: r?.sector ?? sectorLabel, // ✅ inject sector
    sustainability_dimension: normalizedDim
  };
}
