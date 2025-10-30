from fastapi import APIRouter, UploadFile, File, HTTPException
from parsers.excel_parser import extract_questions_for_interactive
from io import BytesIO
import openpyxl

router = APIRouter(prefix="/api", tags=["upload"])

@router.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    """
    Upload Excel and return QUESTIONS ONLY (for interactive questionnaire) from all sheets.
    NO SCORES returned - user will answer them.
    Uses in-memory processing (BytesIO) - perfect for Vercel serverless deployment.
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "Only Excel files (.xlsx, .xls) are supported")
    
    try:
        # Read file content into memory
        content = await file.read()
        excel_file = BytesIO(content)
        
        # Load workbook from memory to get sheet names
        workbook = openpyxl.load_workbook(excel_file, read_only=True)
        all_questions = []
        final_sector = None
        invalid_sheets = []
        
        # Process all sheets
        for sheet in workbook.sheetnames:
            try:
                # Reset BytesIO pointer for each sheet
                excel_file.seek(0)
                
                # Pass BytesIO object to parser instead of file path
                result = extract_questions_for_interactive(excel_file, sheet)
                
                if result["questions"]:
                    all_questions.extend(result["questions"])
                    final_sector = result["sector"]  # Use last non-empty sector
                    
            except ValueError as e:
                if "Header row not found" in str(e):
                    invalid_sheets.append(sheet)
                else:
                    raise  # Re-raise unexpected errors
            except Exception as e:
                # Log but continue with other sheets
                print(f"Error processing sheet '{sheet}': {str(e)}")
                continue
        
        workbook.close()  # Clean up
        
        if not all_questions:
            error_msg = "No valid questions found in the Excel file."
            if invalid_sheets:
                error_msg += f" Invalid header row in sheet(s): {', '.join(invalid_sheets)}. Expected headers: sdg_target, sustainability_dimension, kpi, question, scoring, source, notes, status, comment."
            raise HTTPException(400, error_msg)
        
        return {
            "success": True,
            "questions": all_questions,
            "sector": final_sector,
            "total_questions": len(all_questions)
        }
        
    except openpyxl.utils.exceptions.InvalidFileException:
        raise HTTPException(400, "Invalid Excel file format. Please upload a valid .xlsx or .xls file.")
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to parse Excel: {str(e)}")
