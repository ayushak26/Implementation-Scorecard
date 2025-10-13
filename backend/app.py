from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import upload_excel, questionnaire  # <- fixed name

app = FastAPI(title="SDG Assessment API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # or ["*"] in dev
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
