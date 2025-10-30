from fastapi import FastAPI
from mangum import Mangum
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

app = FastAPI()

# Import routers after path is set
from routers import upload_excel, questionnaire

app.include_router(upload_excel.router)
app.include_router(questionnaire.router)

@app.get("/api/health")
def health():
    return {"status": "healthy"}

# Vercel handler
handler = Mangum(app, lifespan="off")