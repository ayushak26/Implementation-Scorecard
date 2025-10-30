# api/index.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
from pathlib import Path

# Add backend to path
backend = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend))

from routers import upload_excel, questionnaire

app = FastAPI(title="SDG Assessment API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(upload_excel.router)
app.include_router(questionnaire.router)

@app.get("/api/health")
def health():
    return {"status": "healthy", "message": "Running on Vercel"}