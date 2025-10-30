# backend/routers/questionnaire.py

from fastapi import APIRouter, HTTPException
from typing import List, Dict
from pydantic import BaseModel
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
async def get_template():
    """
    Return questions from the last uploaded Excel file.
    If no file has been uploaded yet, loads from default file.
    
    Returns:
        {
            "success": True,
            "questions": [...],
            "sector": "Textiles",
            "total_questions": 50,
            "source": "uploaded" or "default"
        }
    """
    try:
        from utils.cache import questionnaire_cache
        
        # Try to get cached uploaded data first
        cached_data = questionnaire_cache.get_data()
        
        if cached_data:
            # Return uploaded data
            return {
                **cached_data,
                "source": "uploaded"
            }
        
        # No uploaded file yet - load from default file
        from parsers.excel_parser import extract_questions_for_interactive
        
        default_file = os.path.join("backend", "data", "final.xlsx")
        
        if not os.path.exists(default_file):
            default_file = os.path.join("data", "final.xlsx")
            if not os.path.exists(default_file):
                raise HTTPException(
                    404,
                    "No questionnaire available. Please upload an Excel file first."
                )
        
        all_questions = []
        last_sector = "General"
        
        # Load from default file
        for sheet_name in ["Textile_revised", "Fertilizer_revised", "Packaging_revised"]:
            try:
                result = extract_questions_for_interactive(default_file, sheet_name)
                if result["questions"]:
                    all_questions.extend(result["questions"])
                    last_sector = result.get("sector", last_sector)
            except Exception as e:
                print(f"Warning: Could not load sheet '{sheet_name}': {str(e)}")
                continue
        
        if not all_questions:
            raise HTTPException(
                500,
                "No questions available. Please upload an Excel file."
            )
        
        # Cache the default data too
        questionnaire_cache.set_data(all_questions, last_sector)
        
        return {
            "success": True,
            "questions": all_questions,
            "sector": last_sector,
            "total_questions": len(all_questions),
            "source": "default"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to load template: {str(e)}")
