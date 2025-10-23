# backend/routers/upload_excel.py

from fastapi import APIRouter, UploadFile, File, HTTPException
from parsers.excel_parser import extract_questions_for_interactive
import tempfile
import os

router = APIRouter(prefix="/api", tags=["upload"])

@router.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    """
    Upload Excel and return QUESTIONS ONLY (for interactive questionnaire).
    NO SCORES returned - user will answer them.
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "Only Excel files are supported")
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Extract questions from first sheet (can be made dynamic)
        result = extract_questions_for_interactive(tmp_path, sheet_name="Textile_revised")
        
        return {
            "success": True,
            "questions": result["questions"],
            "sector": result["sector"],
            "total_questions": len(result["questions"])
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to parse Excel: {str(e)}")
    finally:
        os.unlink(tmp_path)
