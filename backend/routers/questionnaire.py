# backend/routers/questionnaire.py

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict
from pydantic import BaseModel
from parsers.excel_parser import extract_questions_for_interactive
import os

router = APIRouter(prefix="/api", tags=["questionnaire"])

class UserResponse(BaseModel):
    question_id: str
    score: int  # 0-5

class CalculateRequest(BaseModel):
    responses: List[UserResponse]
    questions: List[Dict]  # Original question data with metadata

@router.post("/questionnaire/calculate")
async def calculate_scorecard(data: CalculateRequest):
    """
    Calculate scorecard from user responses.
    Aggregates scores per SDG, dimension, sector.
    Returns same format as old upload-excel for compatibility.
    """
    try:
        # Map responses by question_id
        response_map = {r.question_id: r.score for r in data.responses}
        
        # Build rows with scores
        rows = []
        for q in data.questions:
            q_id = q.get("id")
            score = response_map.get(q_id, 0)
            
            rows.append({
                "sdg_number": q.get("sdg_number"),
                "sdg_description": q.get("sdg_description"),
                "sdg_target": q.get("sdg_target"),
                "sustainability_dimension": q.get("sustainability_dimension"),
                "kpi": q.get("kpi"),
                "question": q.get("question"),
                "sector": q.get("sector"),
                "score": score,
                "score_description": get_score_description(score)
            })
        
        # Group by sector
        sector_groups = {}
        for row in rows:
            sector = row.get("sector", "Unknown")
            if sector not in sector_groups:
                sector_groups[sector] = []
            sector_groups[sector].append(row)
        
        return {
            "success": True,
            "data": {
                sector: {"rows": rows_list} 
                for sector, rows_list in sector_groups.items()
            }
        }
    except Exception as e:
        raise HTTPException(500, f"Calculation failed: {str(e)}")

def get_score_description(score: int) -> str:
    """Map score to description."""
    descriptions = {
        0: "N/A",
        1: "Issue identified, but no plans for further actions",
        2: "Issue identified, starts planning further actions",
        3: "Action plan with clear targets and deadlines in place",
        4: "Action plan operational - some progress in established targets",
        5: "Action plan operational - achieving the target set"
    }
    return descriptions.get(score, "Unknown")

@router.get("/questionnaire/template")
async def get_template(sheet_name: str = Query(...)):
    """Return a template structure for the questionnaire for the specified sheet"""
    try:
        # Use the same path as the upload endpoint
        excel_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "last_uploaded_file.xlsx")
        if not os.path.exists(excel_file_path):
            raise HTTPException(404, "No Excel file has been uploaded yet")
            
        data = extract_questions_for_interactive(excel_file_path, sheet_name)
        return {
            "success": True,
            **data  # This will include both questions and sector
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch questions for sheet '{sheet_name}': {str(e)}")
