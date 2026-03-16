# QueryBoard — Conversational AI BI Dashboard

> **Ask anything about your data. Get charts, insights, and analysis instantly.**

QueryBoard is a full-stack conversational business intelligence tool built for a hackathon. Upload any CSV or Excel file, ask questions in plain English, and get interactive charts with AI-generated summaries — no SQL, no dashboard configuration required.

---

## Problem

Business analysts and non-technical users need to explore data quickly, but traditional BI tools require SQL knowledge, dashboard setup, and manual chart configuration. This creates a bottleneck — insights are locked behind technical skills and slow tooling. 

---

##  Solution

QueryBoard removes the technical barrier entirely. Users:

1. **Upload** any CSV or XLSX dataset (or use the built-in 11,791-row customer behaviour dataset)
2. **Ask** a question in plain English — *"Compare average online spend vs store spend by city tier"*
3. **Get** interactive charts, AI-generated summaries, and raw data tables — instantly

The system handles fuzzy column matching, CamelCase column names, European number formatting, multi-metric queries, and more — so it works on messy real-world data, not just clean demo files.

---

## Architecture

```
Browser (Next.js on Vercel)
        │
        │  HTTPS / JSON
        ▼
API Layer (Next.js Route Handlers)
        │  /api/query  /api/upload  /api/history
        │  /api/usage  /api/auth
        │
        │  HTTPS / JSON
        ▼
FastAPI Backend (Python on Railway)
        │
        ├── Intent Extraction Pipeline
        │       ├── LLM path: GPT-4o-mini → structured IntentModel JSON
        │       ├── Rule-based fallback: regex + alias matching
        │       ├── Fuzzy column correction (CamelCase, partial names)
        │       └── Multi-metric expansion (and / vs / compare)
        │
        ├── Query Engine
        │       ├── DataFrame filtering + aggregation (pandas)
        │       ├── Aggregations: sum, mean, count, nunique, min, max
        │       └── Top-20 limiting for large categorical results
        │
        ├── Chart Planner
        │       ├── Deterministic chart type selection (bar/line/pie/scatter)
        │       └── Count query normalization (no "Shirt Number" as y-axis)
        │
        ├── Summarizer
        │       ├── GPT-4o-mini with grounded top-3 data facts
        │       └── Prevents hallucinated numbers in summaries
        │
        └── Session Manager
                ├── Uploaded dataframes serialized to Parquet → MongoDB
                └── TTL: sessions 24h, history 7 days
        │
        │  Motor (async)
        ▼
MongoDB Atlas
        ├── users            — email/password accounts
        ├── sessions         — uploaded dataset + schema (TTL 24h)
        ├── query_history    — full chart data per query (TTL 7 days)
        └── usage            — per-user daily quota tracking (TTL reset midnight)
```

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS variables |
| State | Zustand |
| Charts | Recharts |
| Deployment | Vercel |

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115 |
| Language | Python 3.11+ |
| Data | pandas 2.2 + pyarrow 18 |
| LLM | OpenAI GPT-4o-mini |
| Auth | PyJWT + bcrypt |
| Deployment | Railway |

### Database
| Store | Technology |
|---|---|
| Primary DB | MongoDB Atlas (Motor async driver) |
| Session storage | Parquet bytes in MongoDB (Railway filesystem is ephemeral) |

---

## Features

- **Dynamic dataset upload** — CSV and XLSX, drag-and-drop, smart header detection for messy files
- **Conversational queries** — natural language to charts via LLM + rule-based fallback pipeline
- **Fuzzy column matching** — "team" resolves to "Team Initials", "goals scored" to "GoalsScored"
- **Multi-metric queries** — "goals scored and attendance and matches played per year" → 3 charts
- **Distinct counts** — "count of unique players by team" uses `nunique` correctly
- **14 pre-built dashboards** — keyword-matched for the default customer behaviour dataset
- **Query history** — persisted in MongoDB, grouped Today / Yesterday / Earlier, instant restore
- **Usage tiers** — Free (10 queries/day) · Pro $9.99/mo (200/day) · Ultra $49.99/mo (unlimited)
- **Mock checkout** — full pricing → checkout → upgrade flow (no real payment)
- **Mock Google login** — display name prompt, localStorage-persisted, no OAuth round-trip
- **Email/password auth** — full register + login flow with JWT

---

## Project Structure

```
QueryBoard/
├── app/                        # Next.js App Router pages
│   ├── (auth)/login/           # Login page (email + mock Google)
│   ├── (auth)/register/        # Registration page
│   ├── landing/                # Public landing page
│   ├── pricing/                # Pricing tiers
│   ├── checkout/               # Mock payment flow
│   └── api/                    # Next.js route handlers (proxies to FastAPI)
│       ├── query/              # POST /api/query
│       ├── upload/             # POST /api/upload
│       ├── history/            # GET/DELETE /api/history
│       └── usage/              # GET /api/usage, POST /api/usage/upgrade
│
├── components/query-board/     # Main dashboard UI
│   ├── sidebar.tsx             # History, dataset info, usage banner, logout
│   ├── hero-state.tsx          # Landing screen + upload zone
│   ├── dashboard-view.tsx      # Chart grid + bottom query input
│   ├── chart-card.tsx          # Individual chart with Recharts
│   ├── query-input.tsx         # Query bar + session banner
│   └── usage-banner.tsx        # Tier usage progress bars
│
├── lib/
│   ├── store.ts                # Zustand store (query, session, history)
│   └── usage.ts                # Tier definitions and limit helpers
│
└── backend/
    ├── main.py                 # FastAPI app, all routes
    ├── intent_extractor.py     # NLP pipeline (LLM + rules + fuzzy)
    ├── query_engine.py         # pandas aggregation engine
    ├── chart_planner.py        # Chart type selection + title generation
    ├── summarizer.py           # GPT-4o-mini grounded summaries
    ├── validator.py            # IntentModel schema validation
    ├── schema_extractor.py     # DataFrame → schema dict
    ├── dashboard_planner.py    # 14 pre-built dashboard definitions
    └── db/mongodb.py           # Motor collections + TTL indexes
```

---

## Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Python 3.11+
- MongoDB Atlas cluster (free tier works)
- OpenAI API key

### Frontend

```bash
# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env.local
# Add: NEXT_PUBLIC_QUERYBOARD_BACKEND_URL=http://localhost:8000
# Add: QUERYBOARD_BACKEND_URL=http://localhost:8000

# Start dev server
pnpm dev
```

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Add: OPENAI_API_KEY=sk-...
# Add: MONGODB_URL=mongodb+srv://...
# Add: MONGODB_DB_NAME=queryboard

# Start server
uvicorn main:app --reload --port 8000
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Auto-deploys on push to `main` |
| Backend | Railway | `backend/Procfile` configures uvicorn |
| Database | MongoDB Atlas | Free M0 cluster sufficient for demo |

**Required environment variables on Vercel:**
```
NEXT_PUBLIC_QUERYBOARD_BACKEND_URL=https://your-app.railway.app
QUERYBOARD_BACKEND_URL=https://your-app.railway.app
```

**Required environment variables on Railway:**
```
OPENAI_API_KEY=sk-...
MONGODB_URL=mongodb+srv://...
MONGODB_DB_NAME=queryboard
JWT_SECRET=your-secret-key
```

---

## Future Work

- **Real authentication** — replace mock Google login with actual OAuth 2.0
- **Real payments** — integrate Stripe for Pro/Ultra subscriptions
- **Per-user data isolation** — scope history and sessions to authenticated user IDs
- **SSE streaming** — stream chart renders token-by-token for faster perceived performance
- **Chart-level chat** — follow-up questions scoped to a single chart (Prompt 4 spec ready)
- **SQL export** — translate IntentModel to SQL for users who want reproducible queries
- **Scheduled reports** — email digest of daily queries and insights
- **Larger file support** — bypass Vercel 4.5MB limit by uploading directly to Railway in all environments

---

## Built for Hackathon

QueryBoard was built end-to-end during a hackathon. The architecture prioritises:
- **Demo reliability** over production hardening
- **Natural language flexibility** over rigid query schemas
- **Any dataset support** over a single optimised pipeline

The intent extraction pipeline alone went through 5 iterations during the hackathon — from a simple LLM call to a two-layer system with fuzzy matching, CamelCase splitting, European number parsing, and multi-metric expansion.
