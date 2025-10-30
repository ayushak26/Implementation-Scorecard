# api/index.py
from http.server import BaseHTTPRequestHandler
import json
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from io import BytesIO

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
                from routers.questionnaire import get_template
                result = get_template()
                self.send_json(result)
                return
            except Exception as e:
                self.send_error_json(str(e))
                return
        
        self.send_json({"error": "Not found"}, status=404)
    
    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == '/api/upload-excel':
            try:
                # Get multipart form data
                content_type = self.headers.get('Content-Type', '')
                
                if 'multipart/form-data' not in content_type:
                    self.send_error_json("Content-Type must be multipart/form-data")
                    return
                
                # Read body
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                
                # Parse multipart data
                import email
                from email.parser import BytesParser
                
                msg = BytesParser().parsebytes(
                    b'Content-Type: ' + content_type.encode() + b'\r\n\r\n' + body
                )
                
                # Find file part
                file_data = None
                for part in msg.walk():
                    if part.get_filename():
                        file_data = part.get_payload(decode=True)
                        break
                
                if not file_data:
                    self.send_error_json("No file found in request")
                    return
                
                # Process file
                from routers.upload_excel import upload_excel_endpoint
                from io import BytesIO
                
                excel_file = BytesIO(file_data)
                excel_file.seek(0)
                
                # Import parser
                from parsers.excel_parser import extract_questions_for_interactive
                from utils.cache import questionnaire_cache
                
                result = extract_questions_for_interactive(excel_file, None)
                
                if not result.get("questions"):
                    self.send_error_json("No questions found in Excel file")
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
                
                # Import calculate function
                from routers.questionnaire import calculate_scorecard
                
                # Mock request object
                class MockRequest:
                    def __init__(self, data):
                        self.responses = [type('obj', (object,), r) for r in data['responses']]
                        self.questions = data['questions']
                
                result = calculate_scorecard(MockRequest(data))
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