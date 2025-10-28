# backend/routers/upload_excel.py

from fastapi import APIRouter, UploadFile, File, HTTPException
from parsers.excel_parser import extract_sheet_names, extract_questions_for_interactive
import tempfile
import os

router = APIRouter(prefix="/api", tags=["upload"])

@router.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    """
    Upload Excel and return sheet names and QUESTIONS ONLY (for interactive questionnaire).
    NO SCORES returned - user will answer them.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Only Excel files are supported")

    # Save uploaded file persistently using absolute path
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, "last_uploaded_file.xlsx")
    
    # Save the file
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    try:
        # Extract sheet names
        sheet_names = extract_sheet_names(file_path)

        return {
            "success": True,
            "sheets": sheet_names,
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to parse Excel: {str(e)}")

@router.get("/sheets")
async def get_sheets():
    """Return the list of sheet names from the last uploaded Excel file."""
    try:
        # Use absolute path to ensure file is found
        excel_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "last_uploaded_file.xlsx")
        if not os.path.exists(excel_file_path):
            raise HTTPException(404, "No Excel file has been uploaded yet")
        sheet_names = extract_sheet_names(excel_file_path)
        return {"success": True, "sheets": sheet_names}
    except FileNotFoundError:
        raise HTTPException(404, "No Excel file has been uploaded yet")
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch sheet names: {str(e)}")
