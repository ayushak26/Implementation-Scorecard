# backend/routers/questionnaire.py
from fastapi import APIRouter
from typing import List
from models.scorecard import QuestionnaireRow, SectorRows

router = APIRouter(prefix="/api", tags=["questionnaire"])

@router.post("/questionnaire/submit")
async def submit_questionnaire(rows: List[QuestionnaireRow]):
    # Group by sector
    sector_groups = {}
    for row in rows:
        sector = row.sector or "Unknown"
        if sector not in sector_groups:
            sector_groups[sector] = []
        sector_groups[sector].append(row)
    
    return {
        "success": True,
        "data": {
            sector: SectorRows(rows=rows)
            for sector, rows in sector_groups.items()
        }
    }

@router.get("/questionnaire/template")
async def get_template():
    """Return a template structure for the questionnaire"""
    return {
        "sdgs": list(range(1, 18)),
        "dimensions": [
            "Economic Performance",
            "Circular Performance", 
            "Environmental Performance",
            "Social Performance"
        ],
        "score_rubric": {
            0: "N/A",
            1: "Issue identified, but no plans for further actions",
            2: "Issue identified, starts planning further actions",
            3: "Action plan with clear targets and deadlines in place",
            4: "Action plan operational - some progress in established targets",
            5: "Action plan operational - achieving the target set"
        }
    }