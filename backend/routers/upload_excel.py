# backend/routers/upload_excel.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from models.scorecard import UploadExcelResponse, SectorRows, QuestionnaireRow
from parsers.excel_parser import parse_excel_questionnaire  # Your existing parser
import tempfile
import os

router = APIRouter(prefix="/api", tags=["upload"])

@router.post("/upload-excel", response_model=UploadExcelResponse)
async def upload_excel(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "Only Excel files are supported")
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Use your existing parser
        parsed = parse_excel_questionnaire(tmp_path)
        
        # Transform parsed data to match frontend expectations
        sector_to_rows = {}
        
        for sheet_key, sheet_data in parsed.items():
            rows = sheet_data.get('rows', [])
            
            # Group rows by sector
            for row in rows:
                sector = row.get('sector', 'Unknown')
                if sector and sector != 'Unknown':
                    if sector not in sector_to_rows:
                        sector_to_rows[sector] = []
                    sector_to_rows[sector].append(row)
        
        # Convert to response format
        data = {}
        for sector, rows in sector_to_rows.items():
            # Validate and convert each row
            validated_rows = []
            for row in rows:
                try:
                    validated_row = QuestionnaireRow(**row)
                    validated_rows.append(validated_row)
                except Exception as e:
                    print(f"Row validation error: {e}, row: {row}")
                    continue
            
            if validated_rows:
                data[sector] = SectorRows(rows=validated_rows)
        
        return UploadExcelResponse(success=True, data=data)
        
    except Exception as e:
        raise HTTPException(500, f"Error processing file: {str(e)}")
    finally:
        os.unlink(tmp_path)