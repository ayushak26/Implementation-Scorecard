# backend/routers/upload_excel.py

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from typing import Optional
from io import BytesIO
import traceback

router = APIRouter(prefix="/api", tags=["upload"])

@router.post("/upload-excel")
async def upload_excel_endpoint(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None)
):
    """
    Upload an Excel workbook and extract questions.
    The uploaded questions are cached and accessible via /questionnaire/template
    """
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(400, "No file provided")
        
        if not file.filename.lower().endswith(('.xlsx', '.xls')):
            raise HTTPException(400, "File must be an Excel file (.xlsx or .xls)")
        
        # Read file into memory
        content = await file.read()
        excel_file = BytesIO(content)
        excel_file.seek(0)
        
        # Import here to avoid circular dependency
        from parsers.excel_parser import extract_questions_for_interactive
        from utils.cache import questionnaire_cache
        
        print(f"📤 Processing file: {file.filename}, sheet: {sheet_name}")
        
        # Extract questions
        if sheet_name:
            result = extract_questions_for_interactive(excel_file, sheet_name)
        else:
            result = extract_questions_for_interactive(excel_file)
        
        if not result.get("questions"):
            raise HTTPException(
                400, 
                "No questions found. Ensure file has correct format with sheets: "
                "Textile_revised, Fertilizer_revised, or Packaging_revised"
            )
        
        # Cache the uploaded questions for /questionnaire/template to use
        questionnaire_cache.set_data(
            questions=result["questions"],
            sector=result.get("sector", "General")
        )
        
        print(f"✅ Successfully processed {len(result['questions'])} questions")
        
        # Return the same response format
        return {
            "success": True,
            "questions": result["questions"],
            "sector": result.get("sector", "General"),
            "total_questions": len(result["questions"])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Detailed error logging
        error_trace = traceback.format_exc()
        print(f"❌ Upload error:\n{error_trace}")
        
        # Return more detailed error
        raise HTTPException(500, f"Upload processing failed: {str(e)}\n\nCheck server logs for details.")