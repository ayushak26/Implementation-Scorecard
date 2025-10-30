from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import upload_excel, questionnaire
from mangum import Mangum

app = FastAPI(title="SDG Assessment API")

# Updated CORS for production - add your Vercel domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",  # Your Vercel preview deployments
        "https://your-domain.com",  # Replace with your production domain
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Mount routers
app.include_router(upload_excel.router)
app.include_router(questionnaire.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/health")
async def api_health_check():
    return {"status": "healthy", "message": "API is running on Vercel"}

# Mangum handler for Vercel serverless
handler = Mangum(app)
