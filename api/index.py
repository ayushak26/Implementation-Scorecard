# api/index.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
import sys
import os

# Add backend to Python path BEFORE importing
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_path)

# Now import routers
from routers import upload_excel, questionnaire  # type: ignore

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
async def health():
    return {"status": "healthy", "message": "Running on Vercel"}

# Vercel serverless handler
handler = Mangum(app, lifespan="off")