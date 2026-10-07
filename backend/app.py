from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pathlib import Path
import fitz
import sqlite3
import uuid
import re
import io
import csv
import json
from datetime import datetime

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
DATA.mkdir(exist_ok=True)
DB = DATA / "prototype.db"

app = FastAPI(title="Team Nishtha — GeM Bid Compliance API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def db():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    c = db()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS evaluations(
      id TEXT PRIMARY KEY, tender_name TEXT, created_at TEXT, status TEXT
    );
    CREATE TABLE IF NOT EXISTS documents(
      id TEXT PRIMARY KEY, evaluation_id TEXT, bidder TEXT, kind TEXT,
      filename TEXT, text TEXT
    );
    CREATE TABLE IF NOT EXISTS decisions(
      id TEXT PRIMARY KEY, evaluation_id TEXT, bidder TEXT, requirement_id TEXT,
      decision TEXT, comment TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS audit(
      id INTEGER PRIMARY KEY AUTOINCREMENT, evaluation_id TEXT,
      action TEXT, actor TEXT, details TEXT, created_at TEXT
    );
    """)
    c.commit(); c.close()

init_db()

REQUIREMENT_PATTERNS = [
    ("R1", "Bidder must be registered with a valid GST number.", ["gst", "goods and services tax"]),
    ("R2", "Bidder must have at least 3 years of relevant experience.", ["experience", "years"]),
    ("R3", "Minimum annual turnover must be INR 50 lakh.", ["turnover", "50 lakh", "5000000"]),
    ("R4", "Product must include a minimum 1-year warranty.", ["warranty", "1 year", "one year"]),
    ("R5", "Bidder must submit PAN details.", ["pan"]),
    ("R6", "Technical specification compliance declaration must be submitted.", ["technical", "specification", "compliance"]),
    ("R7", "Bidder must submit an authorized signatory declaration.", ["authorized signatory", "signatory"]),
]

def extract_pdf(data: bytes):
    doc = fitz.open(stream=data, filetype="pdf")
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text("text") or ""
        pages.append({"page": i+1, "text": text})
    return pages

def norm(s):
    return re.sub(r"\s+", " ", s.lower()).strip()

def extract_requirements(tender_text):
    t = norm(tender_text)
    reqs = []
    for rid, default_text, keys in REQUIREMENT_PATTERNS:
        if any(k in t for k in keys):
            reqs.append({"id": rid, "requirement": default_text})
    if not reqs:
        # Safe demo fallback: make a small requirement set so the workflow still works.
        reqs = [{"id": x[0], "requirement": x[1]} for x in REQUIREMENT_PATTERNS[:5]]
    return reqs

def evidence_for(text, req):
    t = norm(text)
    rid = req["id"]
    rules = {
        "R1": [r"\bgst(?:in)?\b", r"gst\s*number", r"27[a-z0-9]{10,15}"],
        "R2": [r"(\d+)\s*(?:years?|yrs?)\s*(?:of)?\s*experience", r"experience.*?(\d+)\s*years?"],
        "R3": [r"turnover.{0,50}(?:₹|rs\.?|inr)?\s*([0-9,.]+)\s*(lakh|crore|million)?", r"50\s*lakh"],
        "R4": [r"warranty.{0,50}(1|one)\s*(?:year|yr)", r"warranty"],
        "R5": [r"\bpan\b", r"pan\s*(?:no|number|details)"],
        "R6": [r"technical.*specification", r"compliance\s*(?:declaration|statement)"],
        "R7": [r"authorized\s*signatory", r"signatory\s*declaration"],
    }
    hits = []
    for pattern in rules.get(rid, []):
        m = re.search(pattern, t)
        if m:
            start = max(0, m.start()-90); end = min(len(t), m.end()+150)
            hits.append(t[start:end])
            break
    return hits[0] if hits else ""

def analyze_req(req, bidder_text, pages):
    ev = evidence_for(bidder_text, req)
    rid = req["id"]
    status = "Non-Compliant"
    confidence = 0.91
    risk = "High"
    reason = "Required evidence was not found in the submitted documents."
    if ev:
        status = "Compliant"; risk = "Low"; confidence = 0.94
        reason = "Supporting evidence was found in the bidder submission."
        if rid == "R2":
            nums = re.findall(r"(\d+)\s*(?:years?|yrs?)", ev)
            if nums and int(nums[0]) < 3:
                status, risk, confidence = "Non-Compliant", "High", 0.97
                reason = "Detected experience is below the minimum threshold of 3 years."
        if rid == "R3":
            nums = re.findall(r"([0-9,.]+)\s*(lakh|crore)", ev)
            if nums:
                val = float(nums[0][0].replace(",",""))
                unit = nums[0][1]
                lakhs = val * (100 if unit == "crore" else 1)
                if lakhs < 50:
                    status, risk, confidence = "Non-Compliant", "High", 0.97
                    reason = "Detected turnover is below the minimum INR 50 lakh threshold."
        if rid == "R4" and not re.search(r"(?:1|one)\s*(?:year|yr)", ev):
            status, risk = "Needs Review", "Medium"
            confidence = 0.73
            reason = "Warranty evidence exists, but the exact one-year duration could not be confidently verified."
    return {
        "requirement_id": rid, "requirement": req["requirement"],
        "status": status, "risk": risk, "confidence": confidence,
        "reason": reason, "evidence": ev or "No matching evidence found.",
        "source": pages[0]["page"] if ev and pages else None
    }

def log(eid, action, details, actor="Procurement Officer"):
    c=db()
    c.execute("INSERT INTO audit(evaluation_id,action,actor,details,created_at) VALUES(?,?,?,?,?)",
              (eid, action, actor, details, datetime.now().isoformat(timespec="seconds")))
    c.commit(); c.close()

@app.get("/api/health")
def health():
    return {"ok": True, "service": "nishtha-api"}

@app.get("/api/rules")
def get_rules():
    return {"rules": [
        {"id": rid, "requirement": text, "keywords": keys}
        for rid, text, keys in REQUIREMENT_PATTERNS
    ]}

@app.post("/api/evaluations")
async def create_evaluation(
    tender: UploadFile = File(...),
    bidders: list[UploadFile] = File(...),
):
    if not tender.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Tender must be a PDF")
    eid = str(uuid.uuid4())[:8]
    tender_data = await tender.read()
    tender_pages = extract_pdf(tender_data)
    tender_text = "\n".join(p["text"] for p in tender_pages)
    reqs = extract_requirements(tender_text)

    c=db()
    c.execute("INSERT INTO evaluations VALUES(?,?,?,?)",
              (eid, tender.filename, datetime.now().isoformat(timespec="seconds"), "Analyzed"))
    c.execute("INSERT INTO documents VALUES(?,?,?,?,?,?)",
              (str(uuid.uuid4()), eid, "Tender", "tender", tender.filename, tender_text))
    results={}
    for b in bidders:
        data=await b.read()
        if not b.filename.lower().endswith(".pdf"):
            continue
        pages=extract_pdf(data)
        text="\n".join(p["text"] for p in pages)
        bidder_name=Path(b.filename).stem.replace("_"," ").replace("-"," ").title()
        c.execute("INSERT INTO documents VALUES(?,?,?,?,?,?)",
                  (str(uuid.uuid4()), eid, bidder_name, "bidder", b.filename, text))
        results[bidder_name]=[analyze_req(r,text,pages) for r in reqs]
    c.commit(); c.close()
    log(eid, "Evaluation created", f"{len(reqs)} requirements; {len(results)} bidders analyzed")
    return {"evaluation_id":eid, "tender":tender.filename, "requirements":reqs, "results":results}

@app.get("/api/evaluations/{eid}")
def get_evaluation(eid:str):
    c=db()
    ev=c.execute("SELECT * FROM evaluations WHERE id=?",(eid,)).fetchone()
    if not ev: raise HTTPException(404,"Evaluation not found")
    docs=c.execute("SELECT bidder,kind,filename FROM documents WHERE evaluation_id=?",(eid,)).fetchall()
    decisions=c.execute("SELECT * FROM decisions WHERE evaluation_id=? ORDER BY created_at DESC",(eid,)).fetchall()
    audits=c.execute("SELECT * FROM audit WHERE evaluation_id=? ORDER BY id DESC",(eid,)).fetchall()
    return {"evaluation":dict(ev),"documents":[dict(x) for x in docs],
            "decisions":[dict(x) for x in decisions],"audit":[dict(x) for x in audits]}

@app.post("/api/decisions")
def save_decision(payload:dict):
    required=["evaluation_id","bidder","requirement_id","decision"]
    if any(k not in payload for k in required): raise HTTPException(400,"Missing decision fields")
    c=db()
    c.execute("INSERT INTO decisions VALUES(?,?,?,?,?,?,?)",
              (str(uuid.uuid4()), payload["evaluation_id"], payload["bidder"],
               payload["requirement_id"], payload["decision"], payload.get("comment",""),
               datetime.now().isoformat(timespec="seconds")))
    c.commit(); c.close()
    log(payload["evaluation_id"], "Officer decision",
        f'{payload["bidder"]} / {payload["requirement_id"]}: {payload["decision"]}')
    return {"saved":True}

@app.get("/api/evaluations/{eid}/report.csv")
def report_csv(eid:str):
    c=db()
    docs=c.execute("SELECT bidder,text FROM documents WHERE evaluation_id=? AND kind='bidder'",(eid,)).fetchall()
    tender=c.execute("SELECT text FROM documents WHERE evaluation_id=? AND kind='tender'",(eid,)).fetchone()
    if not tender: raise HTTPException(404,"Evaluation not found")
    reqs=extract_requirements(tender["text"])
    out=io.StringIO()
    w=csv.writer(out)
    w.writerow(["Bidder","Requirement ID","Requirement","Status","Risk","Confidence","Reason","Evidence"])
    for d in docs:
        pages=[{"page":1,"text":d["text"]}]
        for r in reqs:
            x=analyze_req(r,d["text"],pages)
            w.writerow([d["bidder"],x["requirement_id"],x["requirement"],x["status"],x["risk"],
                        x["confidence"],x["reason"],x["evidence"]])
    out.seek(0)
    return StreamingResponse(iter([out.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition":f'attachment; filename="nishtha_{eid}_report.csv"'})

@app.get("/api/evaluations")
def list_evaluations():
    c=db()
    rows=c.execute("SELECT * FROM evaluations ORDER BY created_at DESC").fetchall()
    return [dict(x) for x in rows]
