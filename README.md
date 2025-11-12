# Excel → JSON → Charts (FastAPI + Next.js + Plotly/D3)

## Quickstart

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 and upload an `.xlsx` file.

### Docker (optional)
```bash
docker compose up --build
```

Backend runs on http://localhost:8000, frontend on http://localhost:3000.
# Test deployment
# Test webhook
