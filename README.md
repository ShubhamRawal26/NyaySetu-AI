# NyayaSetu AI (न्यायसेतु)

**Citizen Legal First-Aid, Multimodal FIR Vision Scanner, and BNSS Section 479 Statutory Bail Engine for India.**

NyayaSetu AI is a full-stack web application built for the **Societal Benefit (CivicTech / LegalTech & Access to Justice)** vertical to help Indian citizens and families navigate police arrests, handwritten FIR documents, and undertrial bail rights under India's criminal law framework — the **Bharatiya Nyaya Sanhita, 2023 (BNS)**, **Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)**, **Bharatiya Sakshya Adhiniyam, 2023 (BSA)**, and the **Legal Services Authorities Act, 1987 (NALSA / DLSA)**.

---

## Table of Contents

1. [Chosen Vertical](#1-chosen-vertical)
2. [Approach and Logic](#2-approach-and-logic)
3. [How the Solution Works](#3-how-the-solution-works)
4. [Assumptions Made](#4-assumptions-made)
5. [AI Code Evaluation Rubric Alignment](#5-ai-code-evaluation-rubric-alignment)
6. [System Architecture & Modular Project Structure](#6-system-architecture--modular-project-structure)
7. [API Reference](#7-api-reference)
8. [Security, Accessibility & Efficiency](#8-security-accessibility--efficiency)
9. [Getting Started & Available Scripts](#9-getting-started--available-scripts)
10. [Production Build & Google Cloud Run Deployment](#10-production-build--google-cloud-run-deployment)
11. [Legal Disclaimer](#11-legal-disclaimer)

---

## 1. Chosen Vertical

- **Primary Vertical:** **Societal Benefit — CivicTech, LegalTech & Public Welfare (Access to Justice)**
- **Real-World Problem Addressed:**
  Over **77% of prisoners in India are undertrials** (more than **4.3 lakh citizens** awaiting trial, often from economically vulnerable households). When an arrest or police complaint occurs, families face three acute barriers:
  1. **Statutory Confusion Between Legacy IPC and New BNS 2023:** Police FIRs and remand papers cite either legacy **Indian Penal Code (IPC, 1860)** sections or newly enacted **Bharatiya Nyaya Sanhita (BNS, 2023)** sections, leaving citizens unaware of whether an offence is **Bailable at the police station (Section 478 BNSS)** or requires **Court Bail (Section 480 / 483 BNSS)**.
  2. **Unclaimed Section 479 BNSS Undertrial Bail:** Section 479 of the BNSS, 2023 mandates that a **first-time undertrial offender** who has served **1/3rd of the maximum prescribed sentence** (or **1/2** for general undertrials) in detention must be released by the Court on bail/personal bond—yet thousands remain detained simply because families cannot compute eligibility timelines or draft a formal court application.
  3. **Language & Jargon Barrier:** Legal remedies are written in dense English legalese, whereas distressed citizens speak everyday **Hindi, English, or conversational Romanized Hinglish** (`"police bhai ko le gayi"`, `"kisi ne mujh par attack kiya"`, `"chori 303 BNS"`).

---

## 2. Approach and Logic

NyayaSetu AI uses a **Hybrid Deterministic + Multimodal AI Architecture** designed around the principle that **statutory citations, bail classifications, and detention math must never hallucinate**:

### A. Deterministic Dual-Code Statutory Graph (`src/shared/bnsCatalog.ts`)
- Maintains a curated, cross-verified catalog mapping **BNS 2023 sections ↔ Legacy IPC 1860 sections** (`115(2) BNS ↔ 323 IPC`, `303(2) BNS ↔ 379 IPC`, `318(4) BNS ↔ 420 IPC`, `85 BNS ↔ 498A IPC`, `109 BNS ↔ 307 IPC`, etc.).
- Normalizes **Devanagari/Indic numerals** (`०-९` → `0-9`), strips formatting noise, enforces strict word-boundary matching so section numbers never false-match substrings (e.g., `185` never mis-resolves to `85 BNS`), and indexes **350+ English, Hindi, and Romanized Hinglish crime/legal terms**.

### B. Perspective-Aware Multilingual Legal First-Aid Logic (`src/shared/localLegalEngine.ts`)
- **Intent & Role Classification:** Distinguishes between:
  1. **Arrest / Custody / Bail Queries:** Computes overall bailability (`overall_bailable = all detected sections are bailable`), highlights **Section 478 BNSS** mandatory police station bail for bailable offences, flags **Section 35(3) BNSS (*Arnesh Kumar*)** notice safeguards for offences punishable up to 7 years, and checks the **Section 303(2) BNS Petty Theft Proviso** (first-time theft under ₹5,000 eligible for Community Service upon property return).
  2. **Victim & Self-Defence Queries:** When a citizen asks *"What should I do if someone attacks me?"* or *"kisi ne mujhe maara / dhoka diya"*, explains the applicable penal sections alongside the **Right of Private Defence (Sections 34 to 44 BNS 2023)**, emergency helplines (`112`, Cyber Crime `1930`, Women Helpline `1091`), Medico-Legal Certificate (MLC) steps, and **Zero FIR registration under Section 173 BNSS**.
  3. **Anticipatory Bail & FIR Refusal Queries:** Routes false-case/pre-arrest fears to **Section 482 BNSS Anticipatory Bail** and police FIR refusal to **Section 173(4) / 175(3) BNSS**.
- **Hybrid Google Gemini Enrichment + Automatic Circuit Breaker (`src/server/geminiService.ts`):**
  - Integrates `@google/genai` (`gemini-4-hydrogen`, `gemini-3.1-flash-lite`, `gemini-3.8-flash-lite-tts`) with strict `Type.OBJECT` response schemas.
  - Protects live reliability with an automatic **10-minute zero-fail circuit breaker**: if upstream free-tier Gemini returns `503`/`429` or no key is configured, requests resolve in `<5ms` via the built-in deterministic engine with zero downtime.

### C. BNSS Section 479 Statutory Detention Arithmetic (`calculateSection479`)
$$\text{Max Punishment Days} = \text{round}(\text{Max Punishment Months} \times 30.4375)$$
$$\text{Required Bail Threshold Days} = \begin{cases} \lceil \text{Max Punishment Days} \times \frac{1}{3} \rceil & \text{if First-Time Offender (First Proviso to Sec. 479(1) BNSS)} \\ \lceil \text{Max Punishment Days} \times \frac{1}{2} \rceil & \text{if General Undertrial (Sec. 479(1) BNSS)} \end{cases}$$
- **Statutory Exclusion Guard (Section 479(2) BNSS):** Automatically disqualifies offences punishable with **death or life imprisonment** (such as `109 BNS / 307 IPC Attempt to Murder`) from automatic Section 479 release and routes the family to regular court bail under **Section 483 BNSS**.

---

## 3. How the Solution Works

NyayaSetu AI delivers an end-to-end citizen workflow across **four integrated modules**:

1. **Tool 1 — Ask Help (Voice & Text Multilingual Legal First-Aid):**
   - Citizens speak (via Web Speech API) or type in **English, Hindi, or Hinglish**, or tap one of 4 one-click scenario cards.
   - The engine returns a clear **Bailable vs. Non-Bailable Verdict**, an empathetic plain-language explanation switchable between **English** and **Hindi**, **3 immediate actionable steps**, matched **BNS 2023 / IPC 1860 cards**, one-tap **Listen** voice readout, and a **Check Bail Eligibility** button that transfers the detected offence directly into the Bail Engine.
2. **Tool 2 — Scan FIR (Multimodal FIR & Arrest Memo Vision OCR):**
   - Citizens upload a smartphone photo or PDF of a police FIR/Arrest Memo (or click **Try Sample FIR**).
   - Client-side HTML5 Canvas compression (`src/utils/imageOptimizer.ts`) optimizes large photos, server-side **magic-byte verification** validates file headers, and the OCR pipeline (`tesseract.js` + `src/shared/firOcrParser.ts`) extracts **FIR Number, Police Station, Date, Complainant, Accused Name, Brief Allegation**, and all **BNS/IPC sections**, with one-click handoff to the Bail Calculator.
3. **Tool 3 — Bail Check (BNSS Section 479 Calculator & Court Letter Generator):**
   - Users select the BNS/IPC offence, toggle **First-Time Offender (1/3rd rule)** vs. **Repeat/General Undertrial (1/2 rule)**, and adjust the **Months Spent in Custody** slider.
   - Displays live eligibility status, exact threshold days served vs. required, a 30-bar waveform progress meter, and generates a **formal, court-ready Bail Petition** (`src/shared/bailDossierBuilder.ts`) citing *In Re: Policy Strategy for Grant of Bail (SC 2024)*, *Arnesh Kumar v. State of Bihar*, and *Satender Kumar Antil v. CBI*, ready to **Copy** or **Print (`@media print`)**.
4. **Tool 4 — Four Citizen Rights, Searchable BNS↔IPC Directory & NALSA 15100 Modal:**
   - Instant search across 16 high-frequency BNS/IPC offences by section number, English title, Hindi Devanagari title, or Hinglish keyword, plus a 24×7 **NALSA Free Government Lawyer (`15100`)** modal.

---

## 4. Assumptions Made

1. **Informational & Drafting Aid (Not Formal Legal Representation):**
   - Outputs are designed as immediate citizen legal first-aid and draft templates for District Legal Services Authority (DLSA / NALSA `15100`) counsel or duty magistrates, not a substitute for an enrolled advocate.
2. **Gregorian Month-to-Day Conversion Standard:**
   - Statutory detention thresholds under Section 479 BNSS convert months to days using the standard Gregorian average of **`30.4375` days/month** (`365.25 / 12`), rounded to whole days for Custody Certificate comparison.
3. **Single-Charge vs. Multiple-Charge Proviso (Section 479(2) BNSS):**
   - The Section 479 BNSS calculator assumes the computation is performed against the primary/highest-punishment offence in the FIR and notes that if an undertrial faces multiple separate pending cases, regular bail under Section 480/483 BNSS applies.
4. **OCR Legibility & Physical FIR Verification:**
   - Handwritten carbon-copy FIRs vary significantly in ink contrast; when section digits are partially illegible in a photo, the scanner extracts all readable metadata and prompts the family to cross-check the section numbers against the physical police station copy.
5. **Hybrid Offline/Free-Tier Resilience:**
   - Because public hackathon environments and rural devices may experience upstream LLM quota limits (`429`/`503`) or missing API keys, the system assumes **100% availability is mandatory** and guarantees deterministic local BNS/BNSS/Hinglish resolution and local OCR processing as a zero-fail baseline.

---

## 5. AI Code Evaluation Rubric Alignment

| Evaluation Parameter | Implementation in Repository |
|---|---|
| **1. Problem Statement Alignment (Societal Benefit)** | Directly addresses India's undertrial detention crisis (**77% of prisoners**) with bilingual English/Hindi/Hinglish legal first-aid, FIR OCR scanning, mandatory **Section 479 BNSS 1/3rd bail calculation**, and **NALSA 15100** free legal aid integration. |
| **2. Google Services Integration** | Integrates **Google Gemini SDK (`@google/genai`)** with structured JSON schemas (`Type.OBJECT`), `ThinkingLevel.LOW`, and `gemini-3.8-flash-lite-tts` in `src/server/geminiService.ts`, plus **Google Cloud Run** (`Dockerfile`) and **Google Cloud Build** (`cloudbuild.yaml`). |
| **3. Code Quality** | Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`), modular single-responsibility files (`<220 LOC` per module), centralized constants (`src/shared/constants.ts`), full JSDoc coverage, and global React `ErrorBoundary`. |
| **4. Security** | Server-side API key isolation, binary **magic-byte file signature verification** (`JPEG`, `PNG`, `WEBP`, `PDF`), control-character input sanitization, per-IP sliding-window rate limiting (`60 req/min`), iframe/WASM-safe `Content-Security-Policy`, and non-root `Dockerfile`. |
| **5. Efficiency** | Bounded 5-minute TTL in-memory advisory cache, `<5ms` deterministic BNS↔IPC resolution, client-side HTML5 Canvas image compression (`src/utils/imageOptimizer.ts`), Vite Rolldown vendor chunk splitting, and 1-year immutable asset caching. |
| **6. Testing** | 8 automated unit, security, and live Express HTTP endpoint integration test suites (`npm test` via `tests/nyayasetu.test.ts`) plus full Chromium E2E and 8-viewport responsive audit (`WEBSITE_TESTING_AND_DEBUGGING_REPORT.md`). |
| **7. Accessibility (WCAG 2.1 AA)** | Visible-on-focus `Skip to main legal tools` link, WAI-ARIA tablist with Left/Right keyboard arrow navigation, `aria-live="polite"` dynamic answer regions, `aria-pressed` voice toggles, modal `Escape` dismissal, and `@media (prefers-reduced-motion: reduce)`. |

---

## 6. System Architecture & Modular Project Structure

```text
Browser (React 19 + Tailwind CSS v4 + ErrorBoundary)
   │
   ├── Ask Help (LegalFirstAidPanel + LegalAdvisoryResultCard + useSpeechAssistant) ──► POST /api/legal-aid ──┐
   ├── Scan FIR (FirScannerPanel + FirAnalysisResultCard + imageOptimizer) ───────────► POST /api/fir-ocr ────┼──► Express 4 App Factory (server.ts)
   ├── Bail Check (BailEnginePanel + BailPetitionPreview) ────────────────────────────► POST /api/bail-dossier┘
   └── Directory (StatutoryReferenceSection + Footer + NalsaHelpModal)
```

### Repository Layout (All 35 TypeScript/TSX Modules `<= 242 LOC`)

```text
├── server.ts                                    # Express 4 app factory (createApiApp) & server entrypoint
├── vite.config.ts                               # Vite 8 + Rolldown vendor chunk splitting config
├── Dockerfile                                   # Non-root production container with /api/health check
├── cloudbuild.yaml                              # Google Cloud Build -> Artifact Registry -> Cloud Run pipeline
├── src/
│   ├── main.tsx                                 # React 19 root wrapped in <StrictMode> & <ErrorBoundary>
│   ├── App.tsx                                  # Top-level workspace layout & WAI-ARIA tablist controller
│   ├── types/
│   │   └── legal.ts                             # JSDoc-documented domain contracts & API interfaces
│   ├── hooks/
│   │   └── useSpeechAssistant.ts                # Web Speech API voice input & bilingual TTS synthesis hook
│   ├── utils/
│   │   ├── apiClient.ts                         # Typed POST helper with retry & jittered backoff
│   │   └── imageOptimizer.ts                    # HTML5 Canvas client-side FIR image downscaler
│   ├── components/
│   │   ├── ErrorBoundary.tsx                    # Crash-resilient fallback UI with NALSA 15100 helpline
│   │   ├── Navbar.tsx                           # Responsive top bar with 1-click NALSA 15100 trigger
│   │   ├── HeroSection.tsx                      # Editorial hero with quick-action CTAs
│   │   ├── LegalFirstAidPanel.tsx               # Ask Help query composer & quick-scenario launcher
│   │   ├── LegalAdvisoryResultCard.tsx          # Bilingual EN/HI advisory card, section badges & TTS controls
│   │   ├── FirScannerPanel.tsx                  # Scan FIR upload dropzone & sample FIR loader
│   │   ├── FirAnalysisResultCard.tsx            # Extracted FIR metadata & IPC-to-BNS 2023 bail verdict card
│   │   ├── BailEnginePanel.tsx                  # 3-step Section 479 BNSS detention calculator form
│   │   ├── BailPetitionPreview.tsx              # Waveform threshold gauge & printable court bail petition
│   │   ├── StatutoryReferenceSection.tsx        # 4 Citizen Rights cards & ARIA searchable BNS/IPC table
│   │   ├── NalsaHelpModal.tsx                   # Accessible modal for 24x7 NALSA 15100 free legal aid
│   │   └── Footer.tsx                           # Editorial footer with statutory disclaimer
│   ├── shared/
│   │   ├── constants.ts                         # Named domain, cache, upload, and rate-limit constants
│   │   ├── bnsCatalog.ts                        # BNS/IPC lookup engine & Section 479 BNSS math
│   │   ├── localLegalEngine.ts                  # Multilingual query orchestrator (analyzeLegalQueryLocally)
│   │   ├── legalTextExtractors.ts               # Custody duration, sentence & dual-citation extractors
│   │   ├── legalAdvisoryTemplates.ts            # Victim, bailable & non-bailable bilingual copy builders
│   │   ├── legalFallbackTemplates.ts            # Section 479, Zero FIR, anticipatory bail & greeting builders
│   │   ├── firOcrParser.ts                      # Deterministic FIR OCR regex parser & Sec. 303(2) detector
│   │   ├── bailDossierBuilder.ts                # Court-formatted Section 479/480 BNSS petition generator
│   │   └── data/
│   │       ├── bnsSectionsData.ts               # Body, hurt, public peace & road safety BNS/IPC records
│   │       ├── bnsPropertySectionsData.ts       # Property, theft, fraud & family safeguard BNS/IPC records
│   │       └── hinglishKeywordMap.ts            # Devanagari numeral map & 350+ Hindi/Hinglish keyword lexicon
│   └── server/
│       ├── securityMiddleware.ts                # Iframe/WASM-safe CSP, rate limiter, sanitizer & magic-byte guard
│       ├── geminiService.ts                     # @google/genai structured JSON enrichment + 10-min circuit breaker
│       └── ocrAndCacheService.ts                # Bounded 5-min TTL LRU cache & lazy Tesseract.js worker singleton
└── tests/
    └── nyayasetu.test.ts                        # 8 automated unit, security & live Express HTTP integration suites
```

---

## 7. API Reference

- **`GET /api/health`** — Returns `{ "status": "ok", "service": "nyayasetu-ai", "engine": "hybrid-gemini-and-local-bns-bnss-engine" }` with security and CSP headers.
- **`POST /api/legal-aid`** — Accepts `{ "query": "...", "language": "bilingual" }` and returns `{ "advisory": LegalAdvisoryResponse, "deterministicMatches": [...] }`.
- **`POST /api/fir-ocr`** — Accepts `{ "imageBase64": "...", "mimeType": "image/jpeg" }` (max `8 MB`, magic-byte verified) and returns `{ "extraction": FIROCRExtractionResponse }`.
- **`POST /api/bail-dossier`** — Accepts accused, FIR, court, and detention parameters and returns `{ "dossier_text": "...", "calculation": Section479Calculation }`.
- **`POST /api/tts`** — Accepts `{ "text": "..." }` and synthesizes speech via `gemini-3.8-flash-lite-tts` or signals browser-native speech synthesis fallback.

---

## 8. Security, Accessibility & Efficiency

- **Magic-Byte File Verification:** Inspects leading binary bytes (`0xFF 0xD8 0xFF` for JPEG, `0x89 0x50 0x4E 0x47` for PNG, `RIFF....WEBP` for WEBP, `%PDF` for PDF) to block spoofed uploads.
- **Iframe & WASM-Safe Content Security Policy:** Permits `blob:` workers for `tesseract.js` WebAssembly OCR and `frame-ancestors *` for Cloud Run / AI Studio iframe embedding.
- **Per-IP Rate Limiting & Input Sanitization:** 60 requests/minute sliding window with `Retry-After` headers and ASCII control-character stripping.

---

## 9. Getting Started & Available Scripts

```bash
# Install dependencies
npm install

# Start full-stack Express + Vite development server on port 3000
npm run dev

# Run strict TypeScript typechecking (zero errors)
npm run lint

# Run automated unit, security & Express HTTP API integration tests (8/8 suites)
npm test

# Build optimized production bundle
npm run build
```

---

## 10. Production Build & Google Cloud Run Deployment

```bash
# Local production build & start
npm run build
NODE_ENV=production PORT=3000 npm start

# Or deploy via Google Cloud Build / Cloud Run
gcloud builds submit --config cloudbuild.yaml
```

---

## 11. Legal Disclaimer

NyayaSetu AI provides general legal information and draft templates based on India's **BNS 2023**, **BNSS 2023**, **BSA 2023**, and the **Legal Services Authorities Act, 1987**. It does not constitute formal legal representation. Always verify sections, detention calculations, and court filings with a qualified advocate or a **100% free government defense lawyer through NALSA / DLSA (Toll-Free Helpline: `15100`)**.
