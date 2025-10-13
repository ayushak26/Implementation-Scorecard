export type SustainabilityDimension =
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

export type SectorData = Record<string, { rows: QuestionnaireRow[] }>;