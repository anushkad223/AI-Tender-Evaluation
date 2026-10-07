# Team Nishtha — AI-Powered Integrated Bid Compliance Verification Platform for GeM

A working SIH 2026 prototype for **PS ID SIH26100**.

## What this prototype demonstrates

- Tender + bidder document upload
- PDF text extraction with PyMuPDF
- Requirement extraction using deterministic NLP/regex heuristics
- Rule-based compliance verification
- Evidence snippets linked to source documents
- Risk detection for missing/non-compliant/inconsistent items
- Bidder comparison
- Human-in-the-loop officer review
- Audit trail
- JSON/CSV-style report download from the UI
- No API key required for the demo

## Stack

- Frontend: React + Vite + TypeScript + React Router + CSS
- Backend: Python + FastAPI + PyMuPDF
- Prototype database: SQLite
- Designed to map to the SIH PPT architecture: React/Vite/TypeScript, FastAPI, document processing, AI + rules, RBAC/audit concepts.

## Run

### Backend
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### Frontend
Open another terminal:
```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally http://localhost:5173.

## Demo flow

1. Open Dashboard.
2. Go to **New Evaluation**.
3. Upload one tender PDF and two bidder PDFs.
4. Click **Analyze Bids**.
5. Review requirements, evidence, compliance, risks and bidder comparison.
6. Open a bidder to make officer decisions.
7. Download the audit-ready report.

## Demo data

`sample-data/` contains simple text PDFs you can use immediately.

## Important

This is a prototype. Production GeM integration, government authentication, real LLM inference, OCR for scanned PDFs, pgvector, Supabase Auth/RBAC, and digital signatures should be connected after validation and security review.
