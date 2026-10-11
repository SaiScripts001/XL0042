/**
 * Thin Groq client (plain fetch — no SDK needed) + robust JSON handling.
 * Vision pass  : image → structured extraction (OCR)
 * Text pass(s) : plain-language summary, health chat
 *
 * Quota resilience (hackathon demo-critical):
 *  - Accepts MANY keys: GROQ_API_KEY + GROQ_API_KEYS (comma-separated)
 *    + GROQ_API_KEY_2 … GROQ_API_KEY_10. Each free key = 200K tokens/day,
 *    so N keys = N× the daily budget.
 *  - Round-robins per call to spread load, and rotates to the next key
 *    on 429 (rate limit) / 401 / 403 (bad key).
 *  - A key that just hit 429 is parked in a 4-minute cooldown so the
 *    next request doesn't burn time on it again.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b'
export const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-20b'

/**
 * Groq enforces quotas PER MODEL, not per key — so a second model with a
 * free quota pool is a free backup even with a single API key. When the
 * preferred text model is exhausted we walk this list instead of failing.
 * Order matters: the small chat model goes first so document extraction
 * (which needs the bigger vision model) keeps its quota.
 */
const TEXT_FALLBACKS = (process.env.GROQ_TEXT_FALLBACKS || 'allam-2-7b,qwen/qwen3.8-27b')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

/** Collect every usable Groq key from the environment. */
function loadKeys() {
  const keys = []
  const push = (k) => {
    const v = typeof k === 'string' ? k.trim() : ''
    if (v && !v.includes('YOUR_GROQ') && !keys.includes(v)) keys.push(v)
  }
  push(process.env.GROQ_API_KEY)
  for (const k of (process.env.GROQ_API_KEYS || '').split(',')) push(k)
  for (let i = 2; i <= 10; i++) push(process.env[`GROQ_API_KEY_${i}`])
  return keys
}

export function hasApiKey() {
  return loadKeys().length > 0
}

/** How many keys are configured (shown in the UI status line). */
export function keyCount() {
  return loadKeys().length
}

function chatError(status, body) {
  const err = new Error(`Groq API error ${status}`)
  err.status = status
  err.detail = body
  return err
}

// "key|model" → timestamp until which it is parked after a 429.
// Parked PER KEY + MODEL, because Groq's limits are per key AND per model:
// a capacity error on one key must never disable a model on another key.
const cooldownUntil = new Map()
const MODEL_COOLDOWN_MS = 90 * 1000
let rrIndex = 0 // round-robin cursor for load spreading

/**
 * Cooldown length depends on the pool: with several keys, park a
 * rate-limited key for a while so traffic moves to the others.
 * With a SINGLE key there is nowhere to fail over to, and Groq's
 * daily limit refills continuously — so park only briefly.
 */
function cooldownMs(keyCountNow) {
  return keyCountNow > 1 ? 4 * 60 * 1000 : 45 * 1000
}

/** Ordered candidate models for a request: preferred first, then fallbacks. */
function modelChain(model) {
  if (model === VISION_MODEL) return [model] // extraction must stay on the vision model
  return [model, ...TEXT_FALLBACKS.filter((m) => m !== model)]
}

/** Cooldown slot for a specific key + model pair. */
function slot(key, model) {
  return `${key}::${model}`
}

/* ── Token accounting: one line per call, plus a running total ─────────── */
const spend = { prompt: 0, completion: 0, calls: 0 }
let lastCall = null

function logUsage(key, model, u) {
  spend.prompt += u.prompt_tokens || 0
  spend.completion += u.completion_tokens || 0
  spend.calls += 1
  lastCall = { model, prompt: u.prompt_tokens || 0, completion: u.completion_tokens || 0, total: u.total_tokens || 0 }
  const mins = Math.round(process.uptime() / 60)
  console.log(
    `[tokens] ${model} key…${key.slice(-4)} prompt=${u.prompt_tokens} out=${u.completion_tokens} ` +
      `total=${u.total_tokens} | session: ${spend.calls} calls, ${spend.prompt + spend.completion} tokens (${mins}m)`,
  )
}

export function tokenSpend() {
  return { ...spend, total: spend.prompt + spend.completion, last: lastCall }
}

function rateLimitError() {
  const err = new Error(
    'The AI is resting after many requests today (free daily limit reached). Please wait a few minutes and try again — your records are safe.',
  )
  err.status = 429
  err.allKeysRateLimited = true
  return err
}

/** Keys in rotation order, skipping ones parked in cooldown. */
function activeKeys() {
  const now = Date.now()
  const keys = loadKeys().filter((k) => (cooldownUntil.get(k) || 0) <= now)
  // rotate the starting point so consecutive calls spread across keys
  if (keys.length > 1) {
    rrIndex = (rrIndex + 1) % keys.length
    return [...keys.slice(rrIndex), ...keys.slice(0, rrIndex)]
  }
  return keys
}

/** One chat-completions call with a specific key. */
async function callGroq(key, messages, { model, temperature, maxTokens, jsonMode, retried }) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal: AbortSignal.timeout(90_000),
  })

  const text = await res.text()
  if (!res.ok) throw chatError(res.status, text.slice(0, 800))

  let json
  try {
    json = JSON.parse(text)
  } catch {
    const err = new Error('Unexpected response from Groq API')
    err.status = 502
    err.detail = text.slice(0, 400)
    throw err
  }

  const content = json?.choices?.[0]?.message?.content
  // Track spend so the dev can see where tokens actually go
  if (json?.usage) logUsage(key, model, json.usage)
  // Reasoning models occasionally return an empty message on the first
  // pass — one retry on the SAME key almost always resolves it.
  if (!content && !retried) {
    await new Promise((r) => setTimeout(r, 1200))
    return callGroq(key, messages, { model, temperature, maxTokens, jsonMode, retried: true })
  }
  if (!content) {
    const err = new Error('Groq returned an empty response')
    err.status = 502
    throw err
  }
  return content
}

/**
 * One chat-completions call with automatic failover over the model chain AND
 * the key pool. `messages` may contain image_url parts for vision.
 */
export async function chat(
  messages,
  { model = TEXT_MODEL, temperature = 0.2, maxTokens = 4096, jsonMode = false } = {},
) {
  const attempt = async (maxOut, collect) => {
    const keys = loadKeys()
    if (keys.length === 0) throw rateLimitError()

    for (const m of modelChain(model)) {
      for (const key of keys) {
        if ((cooldownUntil.get(slot(key, m)) || 0) > Date.now()) continue // pair parked
        try {
          return await callGroq(key, messages, {
            model: m,
            temperature,
            maxTokens: maxOut,
            jsonMode,
            retried: false,
          })
        } catch (err) {
          if (err.status === 429) {
            const detail = String(err.detail || '')
            const perMinute = /output tokens per minute|OTPM/i.test(detail)
            collect.lastError = err
            // Per-minute limits clear in seconds — park briefly.
            // Daily limits need a longer park so traffic moves on.
            cooldownUntil.set(
              slot(key, m),
              Date.now() + (perMinute ? 12_000 : Math.max(cooldownMs(keys.length), MODEL_COOLDOWN_MS)),
            )
            const why = detail.match(/"message":"([^"]{0,140})/)?.[1] || 'rate limited'
            console.warn(`[groq] ${m} on key…${key.slice(-4)} → ${perMinute ? 'OTPM' : '429'}: ${why}`)
            if (m !== model) console.warn(`[groq] switching ${model} → ${m}`)
            continue // next key / next model
          }
          if (err.status === 401 || err.status === 403) continue // invalid key
          throw err // network/5xx — surface immediately
        }
      }
    }
    return null // everything was unavailable
  }

  const collect = {}
  const first = await attempt(maxTokens, collect)
  if (first) return first

  // Everything was rate-limited. Two very different 429s get here:
  //  • TPD (tokens per day) — slow to recover, brief wait only.
  //  • OTPM (output tokens per minute) — clears in seconds, and a smaller
  //    output cap usually fixes it outright.
  const detail = String(collect.lastError?.detail || '')
  const perMinute = /output tokens per minute|OTPM/i.test(detail)
  const m = detail.match(/try again in ([\d.]+)\s*s/i)
  const waitMs = perMinute
    ? Math.min(m ? parseFloat(m[1]) * 1000 : 15_000, 25_000)
    : Math.min(m ? parseFloat(m[1]) * 1000 : 8_000, 55_000)

  await new Promise((r) => setTimeout(r, waitMs))
  if (perMinute) {
    // free the per-minute parks so the retried request can use them again
    for (const k of loadKeys()) for (const mm of modelChain(model)) cooldownUntil.delete(slot(k, mm))
  }

  const second = await attempt(perMinute ? Math.max(400, Math.round(maxTokens * 0.6)) : maxTokens, collect)
  if (second) return second

  throw rateLimitError()
}


/** Pull the first balanced JSON object out of a model response (handles ```json fences, preamble). */
export function parseModelJson(raw) {
  if (raw == null) return null
  let text = String(raw).trim()

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) text = fence[1].trim()

  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}
