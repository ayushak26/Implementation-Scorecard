from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import upload_excel, questionnaire

app = FastAPI(title="SDG Assessment API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
        "https://bioradar-implementation-scorecard.com",  # Add your domain
        "http://bioradar-implementation-scorecard.com",   # HTTP version
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Include routers
app.include_router(upload_excel.router)
app.include_router(questionnaire.router)

# Health check endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/health")
async def api_health_check():
    return {"status": "healthy", "message": "API is running on Vercel"}

# Vercel serverless handler
# IMPORTANT: This must be at module level, not inside a function
from mangum import Mangum
handler = Mangum(app, lifespan="off")  # ← Add lifespan="off"