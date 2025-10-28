# backend/models/scorecard.py
from typing import Optional, Dict, List, Literal
from pydantic import BaseModel, Field

class QuestionnaireRow(BaseModel):
    sdg_number: Optional[int] = Field(None, ge=1, le=17)
    sdg_description: Optional[str] = None
    sector: Optional[str] = None
    sdg_target: Optional[str] = None
    sustainability_dimension: Optional[str] = None
    kpi: Optional[str] = None
    question: Optional[str] = None
    score: Optional[int] = Field(None, ge=0, le=5)  # Fixed: was ScoreType
    score_description: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    comment: Optional[str] = None

class SectorRows(BaseModel):
    rows: List[QuestionnaireRow]

class UploadExcelResponse(BaseModel):
    success: bool = True
    data: Dict[str, SectorRows]

class MultiSheetScorecard(BaseModel):
    sheets: Dict[str, SectorRows]  # Each sheet name maps to its respective rows

    def add_sheet(self, sheet_name: str, rows: List[QuestionnaireRow]):
        if sheet_name not in self.sheets:
            self.sheets[sheet_name] = SectorRows(rows=rows)

    def get_sheet(self, sheet_name: str) -> Optional[SectorRows]:
        return self.sheets.get(sheet_name)