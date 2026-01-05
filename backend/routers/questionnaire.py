# backend/routers/questionnaire.py

from fastapi import APIRouter, HTTPException, File, UploadFile
from typing import List, Dict
from pydantic import BaseModel
from io import BytesIO
import os
import statistics

# Create router FIRST before using it
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
                "score_description": get_score_description(score),
                "recommendations": q.get("recommendations", {})  # Include recommendations
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


@router.post("/questionnaire/recommendations")
async def get_recommendations(
    file: UploadFile = File(...),
    sector: str = None
):
    """
    Generate recommendations with maturity levels from uploaded Excel.
    Returns recommendations grouped by SDG with maturity levels.
    """
    try:
        # Import here to avoid circular imports
        import sys
        sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
        
        # Now import from the correct location
        from parsers.excel_parser import extract_questions_for_interactive
        
        # Read uploaded file
        contents = await file.read()
        file_bytes = BytesIO(contents)
        
        # Parse questions with recommendations
        sheet_name = get_sheet_name_for_sector(sector) if sector else None
        data = extract_questions_for_interactive(file_bytes, sheet_name)
        
        # Calculate maturity level for each SDG based on scores
        sdg_maturity = calculate_sdg_maturity_levels(data['questions'])
        
        # Group recommendations by SDG
        recommendations_by_sdg = group_recommendations_by_sdg(
            data['questions'], 
            sdg_maturity
        )
        
        return {
            "success": True,
            "data": {
                "recommendations": recommendations_by_sdg,
                "sector": data.get('sector', 'General'),
                "total_sdgs": len(recommendations_by_sdg)
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")


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


def get_sheet_name_for_sector(sector: str) -> str:
    """Map sector name to Excel sheet name."""
    sector_map = {
        "Textiles": "Textile_revised",
        "Fertilizers": "Fertilizer_revised", 
        "Packaging": "Packaging_revised"
    }
    return sector_map.get(sector, "Textile_revised")


def calculate_sdg_maturity_levels(questions: List[Dict]) -> Dict[int, str]:
    """
    Calculate maturity level for each SDG based on average scores.
    
    Score to Maturity mapping:
    - 0-1.9: awareness
    - 2-3.9: developing
    - 4-5: leading
    """
    sdg_scores = {}
    
    for q in questions:
        sdg = q.get('sdg_number')
        score = q.get('score')
        
        if sdg and score is not None:
            if sdg not in sdg_scores:
                sdg_scores[sdg] = []
            sdg_scores[sdg].append(score)
    
    maturity_levels = {}
    for sdg, scores in sdg_scores.items():
        avg_score = statistics.mean(scores) if scores else 0
        
        if avg_score < 2:
            maturity_levels[sdg] = 'awareness'
        elif avg_score < 4:
            maturity_levels[sdg] = 'developing'
        else:
            maturity_levels[sdg] = 'leading'
    
    return maturity_levels


def group_recommendations_by_sdg(
    questions: List[Dict], 
    sdg_maturity: Dict[int, str]
) -> List[Dict]:
    """
    Group recommendations by SDG with current maturity level.
    Takes the first question's recommendations for each SDG.
    """
    sdg_groups = {}
    
    for q in questions:
        sdg = q.get('sdg_number')
        if not sdg or sdg in sdg_groups:
            continue
        
        recommendations = q.get('recommendations', {})
        if not recommendations:
            continue
        
        sdg_groups[sdg] = {
            'sdg_number': sdg,
            'sdg_description': q.get('sdg_description'),
            'maturity_level': sdg_maturity.get(sdg, 'awareness'),
            'sector': q.get('sector'),
            'sustainability_dimension': q.get('sustainability_dimension'),
            'recommendations': {
                'awareness': recommendations.get('awareness', {}),
                'developing': recommendations.get('developing', {}),
                'leading': recommendations.get('leading', {})
            }
        }
    
    # Sort by SDG number
    return sorted(sdg_groups.values(), key=lambda x: x['sdg_number'])


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