from fastapi import APIRouter, UploadFile, File, HTTPException
from parsers.excel_parser import extract_questions_for_interactive
import tempfile
import os
import openpyxl

router = APIRouter(prefix="/api", tags=["upload"])

@router.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    """
    Upload Excel and return QUESTIONS ONLY (for interactive questionnaire) from all sheets.
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
        # Load workbook to get sheet names
        workbook = openpyxl.load_workbook(tmp_path, read_only=True)
        all_questions = []
        final_sector = None
        invalid_sheets = []
        
        # Process all sheets
        for sheet in workbook.sheetnames:
            try:
                result = extract_questions_for_interactive(tmp_path, sheet)
                if result["questions"]:
                    all_questions.extend(result["questions"])
                    final_sector = result["sector"]  # Use last non-empty sector
            except ValueError as e:
                if "Header row not found" in str(e):
                    invalid_sheets.append(sheet)
                else:
                    raise  # Re-raise unexpected errors
            except Exception as e:
                raise HTTPException(500, f"Error processing sheet '{sheet}': {str(e)}")
        
        if not all_questions:
            error_msg = "No valid questions found in the Excel file."
            if invalid_sheets:
                error_msg += f" Invalid header row in sheet(s): {', '.join(invalid_sheets)}. Expected headers: sdg_target, sustainability_dimension, kpi, question, scoring, source, notes, status, comment."
            raise HTTPException(400, error_msg)
        
        return {
            "success": True,
            "questions": all_questions,
            "sector": final_sector or "General",
            "total_questions": len(all_questions)
        }
    except openpyxl.utils.exceptions.InvalidFileException:
        raise HTTPException(400, "Invalid Excel file format")
    except Exception as e:
        raise HTTPException(500, f"Failed to parse Excel: {str(e)}")
    finally:
        os.unlink(tmp_path)