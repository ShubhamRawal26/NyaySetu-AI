# NyayaSetu AI (न्यायसेतु)

**Citizen Legal First-Aid, Multimodal FIR Vision Scanner, and BNSS Section 479 Statutory Bail Engine for India.**

NyayaSetu AI is a full-stack web application built for the **Societal Benefit & CivicTech / Smart India Access-to-Justice** track to help Indian citizens and families navigate police arrests, FIR documents, and undertrial bail rights under India's criminal law framework — the **Bharatiya Nyaya Sanhita, 2023 (BNS)**, **Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)**, **Bharatiya Sakshya Adhiniyam, 2023 (BSA)**, and the **Legal Services Authorities Act, 1987 (NALSA / DLSA)**.

---

## AI Code Evaluation Rubric Alignment

| Evaluation Parameter | Implementation in Repository |
|---|---|
| **1. Problem Statement Alignment (Societal Benefit)** | Tackles India's undertrial crisis (**77% of prisoners > 4.3 lakh citizens awaiting trial**) by translating complex BNS 2023 / legacy IPC 1860 sections into plain **English, Hindi, and Hinglish**, scanning handwritten FIRs, calculating mandatory **Section 479 BNSS 1/3rd undertrial bail**, and connecting citizens to **NALSA 15100** free legal aid. |
| **2. Google Services Integration** | Integrates **Google Gemini SDK (`@google/genai`)** with structured JSON schema (`Type.OBJECT`), `ThinkingLevel.LOW`, and `gemini-3.8-flash-lite-tts` in `server.ts`, plus **Google Cloud Run** (`Dockerfile`) and **Google Cloud Build** (`cloudbuild.yaml`) deployment configs, paired with a zero-fail circuit breaker and local BNS/BNSS/Hinglish engine (`src/shared/localLegalEngine.ts`). |
| **3. Code Quality** | Strict TypeScript (`tsc --noEmit` zero errors), modular architecture separating shared statutory catalogs (`src/shared/bnsCatalog.ts`), deterministic legal/OCR analysis (`src/shared/localLegalEngine.ts`), typed contracts (`src/types/legal.ts`), and clean React 19 functional components. |
| **4. Security** | Server-side API key isolation, binary **magic-byte file signature verification** (`JPEG`, `PNG`, `WEBP`, `PDF`), control-character input sanitization, per-IP sliding-window rate limiting (`60 req/min` with `Retry-After`), split payload size caps (`256kb` / `12mb`), HTTP security headers (`X-Content-Type-Options: nosniff`, `Permissions-Policy`, `Referrer-Policy`), and non-root container user in `Dockerfile`. |
| **5. Efficiency** | Bounded 5-minute TTL in-memory response caching (`advisoryCache`), `<5ms` O(1)/token-indexed deterministic BNS↔IPC statutory resolution, client-side Canvas image compression (`optimizeImageForOcr`), Vite vendor chunk splitting (`react-vendor`, `ui-icons`), and immutable 1-year static asset caching in production. |
| **6. Testing** | Automated unit & security test suite (`npm test` via `tests/nyayasetu.test.ts`) plus full Chromium E2E, API, and 8-viewport responsive QA audit (`WEBSITE_TESTING_AND_DEBUGGING_REPORT.md`). |
| **7. Accessibility (WCAG 2.1 AA)** | Visible-on-focus `Skip to main legal tools` link, WAI-ARIA tablist with Left/Right keyboard arrow navigation, `aria-live="polite"` dynamic answer regions, `aria-pressed` voice toggles, modal `Escape` dismissal, semantic landmarks, and `@media (prefers-reduced-motion: reduce)`. |

---

## Table of Contents

1. [Problem & Mission](#problem--mission)
2. [Core Features](#core-features)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Project Structure](#project-structure)
6. [API Reference](#api-reference)
7. [Security & Reliability](#security--reliability)
8. [Getting Started](#getting-started)
9. [Environment Variables](#environment-variables)
10. [Available Scripts](#available-scripts)
11. [Production Build & Deployment](#production-build--deployment)
12. [Testing & QA Report](#testing--qa-report)
13. [Legal Disclaimer](#legal-disclaimer)

---

## Problem & Mission

Over **77% of prisoners in India are undertrials** (more than 4.3 lakh citizens awaiting trial). When an arrest happens, families frequently face sudden panic, unfamiliar police paperwork written in legacy IPC or new BNS sections, and lack of clarity on basic constitutional safeguards such as police-station bail, Section 479 BNSS mandatory undertrial release, or free government defense counsel via NALSA (`15100`).

NyayaSetu AI bridges this gap with:
- **Plain-language bilingual guidance** (English and simple spoken Hindi/Devanagari) with zero intimidating jargon.
- **Deterministic statutory cross-checking** between **BNS 2023** and **legacy IPC 1860** sections so bail classifications and punishment thresholds remain legally accurate.
- **One-tap actionable tools** — from scanning a phone photo of a handwritten FIR to calculating Section 479 BNSS eligibility and generating a court-ready bail application.

---

## Core Features

### 1. Ask Help — Voice-First Legal First-Aid
- Speak (via browser Web Speech API) or type any arrest/bail question in English or Hindi, or launch one of four realistic quick examples.
- Returns:
  - Clear **Bailable (Police Station Bail Applies — Sec. 478 BNSS)** vs. **Non-Bailable (Court Bail Required — Sec. 480/483 BNSS)** verdict.
  - Empathetic plain-language summary switchable between **English** and **Hindi**.
  - **Section 479 BNSS** statutory relief callout when applicable.
  - **3 immediate practical next steps** for the family.
  - Matched **BNS 2023 / Legacy IPC 1860** section breakdown with maximum punishment and bailable status.
  - **Listen Audio (TTS)** button powered by Gemini Text-to-Speech returning calm, reassuring spoken guidance (`audio/wav`).
  - Direct **Check Bail Eligibility** handoff to the Bail Engine pre-populated with the detected offence.

### 2. Scan FIR — Multimodal FIR & Arrest Memo Vision OCR
- Accepts phone photos or scans (**JPG, PNG, WEBP, PDF** up to **8 MB**) via drag-and-drop or file picker, plus a built-in **Try Sample FIR** option.
- Extracts **FIR Number**, **Police Station**, **Accused Name**, **Date of Incident**, plain-English **Brief Allegation**, and all cited penal sections.
- Automatically maps legacy **IPC** numbers to **BNS 2023**, cross-verifies them against the deterministic statutory catalog, flags the **Section 303(2) BNS Petty Theft Community Service proviso** (first-time theft under ₹5,000), and hands extracted details straight into the Bail Check calculator.

### 3. Bail Check — BNSS Section 479 Statutory Bail Calculator & Court Letter Generator
- Real-time deterministic calculator implementing **Section 479 BNSS 2023** (which replaced Section 436A CrPC):
  - **First-Time Offender (`1/3rd` Rule):** Mandatory release on personal bond after serving one-third of the maximum sentence.
  - **General Undertrial (`1/2` Rule):** Mandatory release after serving one-half of the maximum sentence.
  - **Statutory Exclusion Guard:** Flags offences punishable with death or life imprisonment (e.g., `109 BNS / 307 IPC`) as excluded from Section 479 and routes guidance toward regular court bail (`Sec. 483 BNSS`).
- Interactive jail-duration slider (automatically clamped to the selected offence's statutory maximum), visual progress waveform, and collapsible optional court particulars (`Accused Name`, `FIR Number`, `Police Station`, `District`).
- Generates a **formal, court-ready Bail Representation / Application** formatted for the Chief Judicial Magistrate (CJM) or Sessions Court citing key Supreme Court precedents (*In Re: Policy Strategy for Grant of Bail (2024)*, *Arnesh Kumar v. State of Bihar*, *Satender Kumar Antil v. CBI*), with one-click **Copy** (with iframe-safe fallback) and **Print** (`@media print` clean court stylesheet).

### 4. Four Citizen Rights & Searchable BNS / IPC Directory
- Highlights four essential statutory safeguards: **Sec. 47 BNSS** (written Arrest Memo & grounds), **Sec. 478 BNSS** (station bail right), **Sec. 479 BNSS** (1/3rd mandatory undertrial bail), and **NALSA Helpline 15100** (free government lawyer under Sec. 12, Legal Services Authorities Act, 1987).
- Searchable 16-section **BNS 2023 ↔ Legacy IPC 1860** directory supporting search by BNS number, IPC number, English offence title, **Hindi title (Devanagari)**, or everyday keywords (`theft`, `420`, `धोखाधड़ी`, `chori`, etc.).
- Every row includes direct **Explain** (prefills Ask Help) and **Check Bail** (loads into Bail Check) actions.

### 5. NALSA Free Government Legal Aid Modal (`15100`)
- Accessible from both the sticky header and footer with `Escape`-key, close-button, and backdrop dismissal, detailing toll-free helpline **15100**, eligibility for anyone in custody, and 3 essential rights to ask for at the police station.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React |
| **Backend** | Node.js (v22+), Express 4, `tsx` (development) / native Node TS execution (production) |
| **AI SDK** | `@google/genai` (server-side only) |
| **AI Models** | `gemini-4-hydrogen` (primary text/vision with `ThinkingLevel.LOW`), `gemini-3.1-flash-lite` (fallback), `gemini-3.8-flash-lite-tts` (`v1beta` WAV TTS) |
| **Typography** | DM Sans, DM Serif Display (Italic), Plus Jakarta Sans |
| **State & Data** | Stateless Express API + deterministic `src/shared/bnsCatalog.ts` + bounded 5-minute in-memory TTL advisory cache |

---

## System Architecture

```text
Browser (React 19 + Tailwind CSS v4 SPA)
   │
   ├── Ask Help (LegalFirstAidPanel) ────────► POST /api/legal-aid ──┐
   │       └── Listen Audio ─────────────────► POST /api/tts ────────┤
   ├── Scan FIR (FirScannerPanel) ───────────► POST /api/fir-ocr ────┼──► Express 4 Server (server.ts)
   ├── Bail Check (BailEnginePanel) ─────────► POST /api/bail-dossier┘        │
   └── Directory (StatutoryReferenceSection) ──► Deterministic                ├── Rate Limiter (60 req/min/IP)
                                                 bnsCatalog.ts                ├── Input Sanitizer & Magic-Byte Check
                                                                              ├── Deterministic BNS↔IPC Catalog + Sec. 479 Math
                                                                              └── Server-Side @google/genai Client
                                                                                  (GEMINI_API_KEY isolated on server)
```

- **Development Mode (`npm run dev`):** `server.ts` starts Express on port `3000` and mounts Vite in `middlewareMode` so API routes and frontend assets run on a single origin.
- **Production Mode (`npm run build && NODE_ENV=production npm start`):** `vite build` bundles the client into `dist/` (and copies `src/assets/` into `dist/src/assets/`), and `server.ts` serves static assets plus SPA fallback alongside `/api/*` endpoints.

---

## Project Structure

```text
.
├── index.html                              # HTML entry point, fonts, SEO/OpenGraph metadata
├── metadata.json                           # Application metadata & permissions
├── package.json                            # Dependencies and npm scripts
├── tsconfig.json                           # TypeScript compiler configuration
├── vite.config.ts                          # Vite 8 + React + Tailwind v4 + asset copy plugin
├── server.ts                               # Express 4 backend, Gemini API routes, security middleware
├── .env.example                            # Required environment variable template
├── WEBSITE_TESTING_AND_DEBUGGING_REPORT.md # Full Chromium E2E, API, responsive & prod QA report
├── public/
│   ├── favicon.ico                         # Site favicon
│   └── assets/aistudio/worker_ace1c74d.png # Hero NyayaSetu emblem image
└── src/
    ├── main.tsx                            # React root mount
    ├── App.tsx                             # Main layout, 3-tool workspace tabs, modal & handoff state
    ├── index.css                           # Neo-editorial theme tokens, ink-card/button styles, print rules
    ├── assets/images/
    │   └── sample_fir_document_*.jpg       # Sample handwritten FIR image for one-tap OCR testing
    ├── shared/
    │   └── bnsCatalog.ts                   # 16-section BNS↔IPC catalog, token matcher, Sec. 479 calculator
    ├── types/
    │   └── legal.ts                        # Shared TypeScript interfaces for client & server
    └── components/
        ├── Navbar.tsx                      # Adaptive sticky header with active-tab indicators
        ├── HeroSection.tsx                 # Night-emerald hero + 4-column Quick Facts strip
        ├── LegalFirstAidPanel.tsx          # Voice/text legal first-aid + bilingual summary + TTS audio
        ├── FirScannerPanel.tsx             # Drag-and-drop FIR photo/PDF upload & OCR breakdown
        ├── BailEnginePanel.tsx             # Live Sec. 479 calculator + printable court bail letter
        ├── StatutoryReferenceSection.tsx   # 4 Citizen Rights cards + searchable BNS/IPC directory
        └── NalsaHelpModal.tsx              # Free Government Legal Aid (15100) dialog
```

---

## API Reference

All API routes return JSON, set `Cache-Control: no-store, no-cache, must-revalidate`, and are protected by per-IP rate limiting (`60 requests / 60 seconds`). Unknown `/api/*` routes return `404 { "error": "API endpoint not found." }`.

### `GET /api/health`
Health check endpoint.
- **Response `200`:** `{ "status": "ok", "service": "nyayasetu-ai" }`

### `POST /api/legal-aid`
Bilingual empathetic legal first-aid grounded in BNS/BNSS 2023 + 4 golden few-shot examples + deterministic catalog pre-matching.
- **Request Body (`application/json`, max `256kb`):**
  ```json
  {
    "query": "Police arrested my brother under Section 323 IPC and 506 IPC. Can we get bail?",
    "language": "bilingual"
  }
  ```
- **Validation:** `query` must be at least 3 characters (sanitized and capped at 3,000 characters).
- **Response `200`:** `{ "advisory": LegalAdvisoryResponse, "deterministicMatches": [...] }`

### `POST /api/fir-ocr`
Multimodal vision OCR for photographed/scanned Indian FIRs, Arrest Memos, and Remand Papers.
- **Request Body (`application/json`, max `12mb`):**
  ```json
  {
    "imageBase64": "data:image/jpeg;base64,...",
    "mimeType": "image/jpeg",
    "notes": "Optional family context"
  }
  ```
- **Validation:** Allowed MIME types (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`), max decoded size `8 MB`, and server-side **magic-byte header verification** to block spoofed files.
- **Response `200`:** `{ "extraction": FIROCRExtractionResponse }`

### `POST /api/bail-dossier`
Generates a formal court-ready Section 479 / 480 / 483 BNSS bail application using server-verified statutory arithmetic.
- **Request Body (`application/json`, max `256kb`):**
  ```json
  {
    "accusedName": "Ramesh Kumar",
    "firNumber": "0142/2026",
    "policeStation": "Kotwali Nagar",
    "district": "Lucknow",
    "bnsSection": "303(2) BNS",
    "ipcSection": "379 IPC",
    "offenceTitle": "Theft",
    "maxPunishmentMonths": 36,
    "undergoneDays": 426,
    "isFirstTimeOffender": true
  }
  ```
- **Validation:** `accusedName`, `firNumber`, and `policeStation` are required; numeric inputs are bounded server-side.
- **Response `200`:** `{ "dossier_text": "...", "calculation": Section479Calculation }`

### `POST /api/tts`
Synthesizes calm, empathetic Hindi/English spoken reassurance audio via `gemini-3.8-flash-lite-tts`.
- **Request Body (`application/json`, max `256kb`):**
  ```json
  { "text": "घबराइए मत। थाने से जमानत आपका कानूनी अधिकार है।" }
  ```
- **Response `200`:** `{ "audioBase64": "<base64 WAV>", "mimeType": "audio/wav" }`

---

## Security & Reliability

- **Strict Server-Side Key Isolation:** `GEMINI_API_KEY` is read exclusively in `server.ts` and never bundled into or exposed to the browser.
- **HTTP Security Headers:** Disables `X-Powered-By`, sets `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), geolocation=(), microphone=(self)`, and `Cache-Control: no-store` on all `/api/*` routes.
- **Upload Hardening:** Enforces client-side and server-side MIME checks, an `8 MB` decoded size cap, and binary magic-byte inspection (`JPEG`, `PNG`, `WEBP`, `PDF`).
- **Rate Limiting & Payload Bounds:** Per-IP sliding-window limiter (`60 req/min`) with `Retry-After` header, split JSON body limits (`256kb` text / `12mb` uploads), and clean JSON error handling for malformed or oversized (`413`) requests.
- **Resilient AI Failover & Normalization:** 18-second per-attempt timeout, automatic failover from `gemini-4-hydrogen` to `gemini-3.1-flash-lite` on transient errors (`429`/`500`/`503`/`504`), bounded 5-minute TTL response caching on `/api/legal-aid`, defensive markdown-fence stripping + schema normalization, and sanitized user-facing error messages (never leaking stack traces or upstream internals).

---

## Getting Started

### Prerequisites
- **Node.js `>= 22`** (required for native TypeScript execution of `node server.ts` in production)
- **npm** (or Bun)
- A valid **Gemini API Key**

### Installation

```bash
npm install
```

### Run in Development

```bash
npm run dev
```

The application starts on `http://localhost:3000` (override with `PORT` or `--port <number>`).

---

## Environment Variables

Copy `.env.example` to `.env` for local development:

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Server-side API key for `@google/genai` calls (configured via **Settings > Secrets** in AI Studio). |
| `APP_URL` | Optional | Public base URL of the hosted application. |
| `PORT` | Optional | Server port (defaults to `3000`). |
| `NODE_ENV` | Optional | Set to `production` to serve pre-built `dist/` assets instead of Vite dev middleware. |

---

## Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `tsx server.ts` | Start full-stack Express + Vite development server on port `3000` |
| `npm run build` | `vite build` | Build optimized production frontend bundle into `dist/` |
| `npm start` | `node server.ts` | Start server directly with Node.js (use with `NODE_ENV=production`) |
| `npm run lint` | `tsc --noEmit` | Run strict TypeScript typechecking across client and server |
| `npm test` | `tsx --test tests/nyayasetu.test.ts` | Run automated unit & integration tests (BNS/IPC catalog, Sec. 479 math, Hinglish legal engine, OCR & bail dossier) |
| `npm run preview` | `vite preview` | Preview built static frontend bundle |
| `npm run clean` | `rm -rf dist server.js` | Remove build artifacts |

---

## Production Build & Deployment

```bash
# 1. Typecheck and build the production bundle
npm run lint
npm run build

# 2. Launch the production server
NODE_ENV=production PORT=3000 npm start
```

---

## Testing & QA Report

A complete end-to-end QA audit — covering unit tests on `bnsCatalog.ts`, API endpoint validation & live tests, headless Chromium E2E user workflows, all 8 responsive viewports (`1920×1080` down to `360×800`), and production build/server verification — is documented in [`WEBSITE_TESTING_AND_DEBUGGING_REPORT.md`](./WEBSITE_TESTING_AND_DEBUGGING_REPORT.md).

---

## Legal Disclaimer

NyayaSetu AI provides general legal information and draft templates based on India's **BNS 2023**, **BNSS 2023**, **BSA 2023**, and the **Legal Services Authorities Act, 1987**. It does not constitute formal legal representation. Always verify sections, detention calculations, and court filings with a qualified advocate or a **100% free government defense lawyer through NALSA / DLSA (Toll-Free Helpline: `15100`)**.
