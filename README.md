# AI-Powered Integrated Bid Compliance Verification Platform for GeM

> A prototype for faster, transparent, and evidence-based tender and bid compliance verification.

## What This Prototype Demonstrates

This prototype streamlines the bid evaluation workflow by bringing tender requirements, bidder submissions, compliance checks, evidence, risks, and officer review into a single platform.

### Core Capabilities

- Tender + Bidder Document Upload
- PDF Text Extraction using PyMuPDF
- Requirement Extraction using deterministic NLP and regex heuristics
- Rule-Based Compliance Verification
- Evidence Snippets linked to source documents
- Risk Detection for missing, non-compliant, and inconsistent items
- Bidder Comparison
- Human-in-the-Loop Officer Review
- Audit Trail  
- JSON/CSV-Style Report Download directly from the UI
- No API Key Required for the current demo

---

## How It Works

```text
Tender & Bidder Documents
          ↓
     PDF Processing
          ↓
  Requirement Extraction
          ↓
 Compliance Verification
          ↓
 Evidence & Risk Detection
          ↓
    Bidder Comparison
          ↓
   Officer Review
          ↓
     Final Report
