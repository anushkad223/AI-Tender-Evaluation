# Prototype architecture

```text
                   ┌──────────────────────────┐
                   │ React + Vite + TypeScript │
                   │ Dashboard / Upload /     │
                   │ Evidence / Officer Review │
                   └─────────────┬────────────┘
                                 │ REST
                   ┌─────────────▼────────────┐
                   │ FastAPI                    │
                   │ Evaluation API             │
                   ├─────────────┬────────────┤
                   │ PDF parsing  │ Rules/NLP  │
                   │ PyMuPDF      │ Engine     │
                   └──────┬──────┴─────┬──────┘
                          │             │
                   ┌──────▼─────┐ ┌────▼────────┐
                   │ SQLite     │ │ Audit Trail │
                   │ Prototype  │ │ Decisions   │
                   └────────────┘ └─────────────┘
```

Production mapping from the SIH concept:
- SQLite -> Supabase PostgreSQL
- Local file storage -> Supabase Storage
- Prototype deterministic NLP -> LLM/NLP + OCR pipeline
- Local rules -> configurable policy/rules service
- Simple local user -> Supabase Auth + RBAC/JWT
- SQLite audit table -> immutable audit logging
- Keyword evidence -> pgvector semantic retrieval + page/section evidence
