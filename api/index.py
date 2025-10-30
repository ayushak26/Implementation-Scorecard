# api/index.py
from http.server import BaseHTTPRequestHandler
import json
import sys
from pathlib import Path
from urllib.parse import urlparse
from io import BytesIO
import asyncio

# Add backend to path
root = Path(__file__).resolve().parent.parent
sys.path.append(str(root / "backend"))

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == '/api/health':
            self.send_json({"status": "healthy", "message": "Running on Vercel"})
            return
        
        if path == '/api/questionnaire/template':
            try:
                # Direct implementation instead of calling async function
                from utils.cache import questionnaire_cache
                from parsers.excel_parser import extract_questions_for_interactive
                import os
                
                # Try to get cached data
                cached_data = questionnaire_cache.get_data()
                
                if cached_data:
                    result = {**cached_data, "source": "uploaded"}
                else:
                    # Load from default file
                    default_file = os.path.join("backend", "data", "final.xlsx")
                    
                    if not os.path.exists(default_file):
                        default_file = os.path.join("data", "final.xlsx")
                    
                    if not os.path.exists(default_file):
                        self.send_error_json("No questionnaire available")
                        return
                    
                    all_questions = []
                    last_sector = "General"
                    
                    for sheet_name in ["Textile_revised", "Fertilizer_revised", "Packaging_revised"]:
                        try:
                            sheet_result = extract_questions_for_interactive(default_file, sheet_name)
                            if sheet_result.get("questions"):
                                all_questions.extend(sheet_result["questions"])
                                last_sector = sheet_result.get("sector", last_sector)
                        except:
                            continue
                    
                    questionnaire_cache.set_data(all_questions, last_sector)
                    
                    result = {
                        "success": True,
                        "questions": all_questions,
                        "sector": last_sector,
                        "total_questions": len(all_questions),
                        "source": "default"
                    }
                
                self.send_json(result)
                return
                
            except Exception as e:
                import traceback
                print(f"Template error:\n{traceback.format_exc()}")
                self.send_error_json(f"Template failed: {str(e)}")
                return
        
        self.send_json({"error": "Not found"}, status=404)
    
    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == '/api/upload-excel':
            try:
                # Get content type and length
                content_type = self.headers.get('Content-Type', '')
                content_length = int(self.headers.get('Content-Length', 0))
                
                if 'multipart/form-data' not in content_type:
                    self.send_error_json("Content-Type must be multipart/form-data", status=400)
                    return
                
                # Read body
                body = self.rfile.read(content_length)
                
                # Parse multipart data
                boundary = content_type.split('boundary=')[1].encode()
                parts = body.split(b'--' + boundary)
                
                file_data = None
                for part in parts:
                    if b'Content-Disposition' in part and b'filename=' in part:
                        # Extract file data (after headers)
                        file_content = part.split(b'\r\n\r\n', 1)
                        if len(file_content) > 1:
                            file_data = file_content[1].rstrip(b'\r\n')
                            break
                
                if not file_data:
                    self.send_error_json("No file found in request", status=400)
                    return
                
                # Process file
                from parsers.excel_parser import extract_questions_for_interactive
                from utils.cache import questionnaire_cache
                
                excel_file = BytesIO(file_data)
                excel_file.seek(0)
                
                result = extract_questions_for_interactive(excel_file, None)
                
                if not result.get("questions"):
                    self.send_error_json("No questions found in Excel file", status=400)
                    return
                
                # Cache results
                questionnaire_cache.set_data(
                    questions=result["questions"],
                    sector=result.get("sector", "General")
                )
                
                response = {
                    "success": True,
                    "questions": result["questions"],
                    "sector": result.get("sector", "General"),
                    "total_questions": len(result["questions"])
                }
                
                self.send_json(response)
                return
                
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                print(f"Upload error:\n{error_trace}")
                self.send_error_json(f"Upload failed: {str(e)}")
                return
        
        if path == '/api/questionnaire/calculate':
            try:
                # Read JSON body
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                data = json.loads(body.decode('utf-8'))
                
                # Direct implementation instead of calling async function
                responses = data.get('responses', [])
                questions = data.get('questions', [])
                
                # Map responses by question_id
                response_map = {r['question_id']: r['score'] for r in responses}
                
                # Build rows with scores
                rows = []
                for q in questions:
                    q_id = q.get("id")
                    score = response_map.get(q_id, 0)
                    
                    score_descriptions = {
                        0: "N/A",
                        1: "Issue identified, but no plans for further actions",
                        2: "Issue identified, starts planning further actions",
                        3: "Action plan with clear targets and deadlines in place",
                        4: "Action plan operational - some progress in established targets",
                        5: "Action plan operational - achieving the target set"
                    }
                    
                    rows.append({
                        "sdg_number": q.get("sdg_number"),
                        "sdg_description": q.get("sdg_description"),
                        "sdg_target": q.get("sdg_target"),
                        "sustainability_dimension": q.get("sustainability_dimension"),
                        "kpi": q.get("kpi"),
                        "question": q.get("question"),
                        "sector": q.get("sector"),
                        "score": score,
                        "score_description": score_descriptions.get(score, "Unknown")
                    })
                
                # Group by sector
                sector_groups = {}
                for row in rows:
                    sector = row.get("sector", "Unknown")
                    if sector not in sector_groups:
                        sector_groups[sector] = []
                    sector_groups[sector].append(row)
                
                result = {
                    "success": True,
                    "data": {
                        sector: {"rows": rows_list} 
                        for sector, rows_list in sector_groups.items()
                    }
                }
                
                self.send_json(result)
                return
                
            except Exception as e:
                import traceback
                print(f"Calculate error:\n{traceback.format_exc()}")
                self.send_error_json(f"Calculate failed: {str(e)}")
                return
        
        self.send_json({"error": "Not found"}, status=404)
    
    def do_OPTIONS(self):
        # CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def send_error_json(self, message, status=500):
        self.send_json({"error": message}, status=status)