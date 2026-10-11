# Ayu Copilot — AI-Powered Personal Health Copilot

Turns prescriptions, lab reports and discharge summaries into one understandable health story:
**upload → AI reads it (vision OCR) → plain-language summary in your language → unified timeline → nearby care.**

Built as a web app (React + Express) with **Groq** doing the AI work — vision OCR, health summaries and the
conversational assistant. UI follows the Ayu design language (Poppins, coral `#F4643C`, slate `#332F3C`).

---

## Quick start

```bash
# 1. Install dependencies (one time)
npm install

# 2. Add your Groq key
#    open .env  →  GROQ_API_KEY=gsk_...
#    free key: https://console.groq.com/keys

# 3. Run
npm run dev
```

Then open **http://localhost:5173**

| What | Where |
| --- | --- |
| React app (Vite) | http://localhost:5173 |
| Express + Groq API | http://localhost:3001 |

> No key yet? The app still runs — upload will show a clear "add your API key" message, and
> **Timeline → Load sample data** gives you a full demo profile to click through.

### Production build

```bash
npm run build     # → /dist
npm start         # Express serves the built app on :3001
```

---

## Features

| Round 1 scope | How it's implemented |
| --- | --- |
| **Medical Record Intelligence & OCR** | Groq vision (`qwen/qwen3.8-27b`, the current supported vision model) reads photos/screenshots/PDF pages — printed *and* handwritten, English/हिन्दी/తెలుగు/தமிழ் — and returns structured JSON: medicines, dosages, frequencies, test values, reference ranges, flags, diagnoses, dates. Two-pass prompting (transcribe everything first, then structure) plus per-item `uncertain` flags and a completeness checklist make every extraction verifiable. |
| **AI Health Summary in Simple Language** | Second Groq pass turns that JSON into a plain-language summary that explains abnormal values against the printed reference range, without diagnosing. |
| **Unified Health Profile** | Everything lands on one chronological timeline with search, filters, stat cards (records / active medicines / values to discuss / conditions). |

**Bonus features**

| Bonus | How it's implemented |
| --- | --- |
| **Multi-language** | Full UI in English, हिन्दी, తెలుగు, தமிழ் (switcher in the navbar). Summaries and the assistant reply in the same language; Noto fonts included so Indic scripts render correctly. |
| **ABDM / ABHA readiness** | `lib/fhir.js` maps records to FHIR R4 resources (Patient, Observation, MedicationRequest, Condition, DocumentReference) with an NDHM-style profile and ABHA-number extension. Export/import a Bundle JSON from **Profile**, plus a simulated ABHA link (clearly labelled as a mock). |

**Added beyond the brief**

- **Nearby hospitals & clinics** — Leaflet + OpenStreetMap + Overpass API (no API key), **auto live-location with accuracy circle and live-tracking toggle**,
  category filters (hospitals / clinics / pharmacies), radius, distance, one-tap directions.
  Optional `GOOGLE_PLACES_API_KEY` unlocks **live Google ratings, review counts and top reviews**;
  without it the map gracefully uses OSM data. Ratings shown are always labelled overall Google
  ratings — disease-specific "cure ratings" don't exist in any public API, so they are never invented.
- **AI health assistant** — chat grounded in the records you uploaded, with emergency guardrails.
  Available as a **floating widget on every page** plus a full page with **in-chat document upload**
  (extract → discuss → save to timeline) and **one-tap hospital-map handoff** (`/hospitals?specialty=`).
- **Condition care guides** — per-diagnosis plain-language guides (what it means, usual care pillars,
  everyday habits, red flags, questions for your doctor, relevant specialty + map link).
  Deliberately never prescribes specific medicines — safe wording protects the Healthcare Impact score.
- **Editable review step** — fix anything the OCR misread before it enters your timeline.
- **Everything stays local** — records live in your browser's localStorage.

---

## Project structure

```
├── server/                    Express API (Groq proxy — keeps your key off the client)
│   ├── index.js               app + static serving in production
│   ├── routes/api.js          /extract · /summarize · /chat · /health + JSON normalisation
│   ├── services/groq.js       Groq client, model IDs, robust JSON parsing
│   └── lib/prompts.js         extraction / summary / chat prompts (safety rules baked in)
├── client/                    React 18 + Vite + Tailwind v4
│   ├── index.html             Poppins + Noto Indic fonts
│   └── src/
│       ├── pages/             Landing · Scan · Timeline · RecordView · Chat · Hospitals · Profile
│       ├── components/        Navbar · Footer · Logo · Mockups · ui primitives
│       ├── lib/i18n.js        4-language string tables
│       ├── lib/files.js       image/PDF → JPEG pages (pdf.js) for vision OCR
│       ├── lib/fhir.js        FHIR Bundle export / import (ABDM-ready)
│       ├── lib/sample.js      demo data for pitches
│       └── store.jsx          state + localStorage persistence
├── .env                       GROQ_API_KEY (you create this)
├── ARCHITECTURE.md            pipeline + data-model diagram
└── package.json               one install, one dev command
```

---

## API

| Method | Endpoint | Body | Returns |
| --- | --- | --- | --- |
| `POST` | `/api/extract` | `{ images: dataURL[], docTypeHint? }` | structured record (medicines, labs, vitals, diagnoses, transcription, uncertain flags…) |
| `POST` | `/api/summarize` | `{ record, language }` | plain-language summary in that language |
| `POST` | `/api/guide` | `{ diagnosis, context, language }` | safe condition care guide (never prescribes) |
| `POST` | `/api/chat` | `{ messages, profile, language }` | grounded assistant reply (can include `/hospitals` map links) |
| `POST` | `/api/places/google` | `{ lat, lng, radius, category, specialty? }` | Google-rated places + reviews (needs key; else 503) |
| `GET` | `/api/health` | — | `{ hasKey, hasGoogle, visionModel, textModel }` |

**Rate limits (Groq free tier: 200K tokens/day).** The server translates HTTP 429 into a
patient-friendly "AI is resting, try again in a few minutes" message instead of a raw error.

Models (override in `.env`):

```
GROQ_VISION_MODEL=qwen/qwen3.8-27b
GROQ_TEXT_MODEL=openai/gpt-oss-20b
```

---

## Safety wording (deliberate)

Every AI output carries the same rules, enforced in `server/lib/prompts.js`:

- never diagnoses, never says "you have X"
- never recommends starting / stopping / changing a dose
- abnormal values are explained and routed to "discuss with your doctor"
- a persistent disclaimer plus **in an emergency call 108**

---

## 🔑 Quota & backup keys (demo-proofing)

Groq's free tier allows **200K tokens/day per ORGANIZATION** (per account),
and separately **per model**. That shapes everything below.

1. **Backup models — free, instant, no new signup** — if the text model
   hits its daily limit, the server automatically walks
   `GROQ_TEXT_FALLBACKS` (default `allam-2-7b,qwen/qwen3.8-27b`). Because
   quotas are per model, this restores the AI assistant instantly:
   ```env
   GROQ_TEXT_FALLBACKS=allam-2-7b,qwen/qwen3.8-27b
   ```
   The terminal prints which model answered, e.g.
   `[groq] openai/gpt-oss-20b on key…h0j5 → switching → allam-2-7b`.

2. **Backup keys — for more capacity** — extra keys go in `.env`:
   ```env
   GROQ_API_KEY=gsk_main_key
   GROQ_API_KEYS=gsk_key2,gsk_key3
   ```
   The server round-robins across keys and auto-fails-over on
   429/401/403, parking a spent key+model pair for 90s.
   ⚠️ **Keys from the SAME Groq account share one daily pool** — extra keys
   on one account do NOT multiply your quota. To genuinely double capacity,
   create a second account (different email) and use its key.

3. **Offline fallback — never a dead demo** — if every key *and* model is
   exhausted, the assistant, summaries and condition guides switch to a
   clearly-labelled **offline mode** that answers from your saved records
   (medicines, tests, flagged values, profile) instead of failing. Full AI
   returns the moment the quota resets.

4. **Cost levers built in** — images are downscaled to 1280px before upload
   (vision tokens scale with image area), summaries are cached per
   record/language, and chat context is trimmed.

**Rough demo budget:** 1 document upload ≈ 6–10K tokens, 10 chat messages
≈ 12–18K. One account comfortably survives a demo session; a second
*account* (not just a second key) makes it bulletproof.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Add your Groq API key…` on upload | Paste a real key into `.env`, then restart `npm run dev`. |
| `Could not read this document` | Take a straighter, well-lit photo, or upload a screenshot instead. |
| Map shows no results | Overpass mirrors are occasionally down — press the retry button, or widen the radius. |
| `npm install` warns about esbuild scripts | `npm install-scripts approve esbuild` |
| Port busy | `PORT=3002 npm run dev` |
