/**
 * Thin client for the Express/Groq API.
 * Local dev: Vite proxies /api to localhost:3001. Split production hosting
 * (frontend on Vercel, API on Render): set VITE_API_URL to the API origin,
 * e.g. https://ayu-api.onrender.com. Single-origin hosting needs nothing.
 */
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function request(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  async health() {
    const res = await fetch(`${API_BASE}/api/health`)
    return res.json()
  },
  extract: (images, docTypeHint) => request('/api/extract', { images, docTypeHint }),
  summarize: (record, language) => request('/api/summarize', { record, language }),
  chat: (messages, profile, language, records) => request('/api/chat', { messages, profile, language, records }),
  guide: (diagnosis, context, language) => request('/api/guide', { diagnosis, context, language }),
  placesGoogle: (lat, lng, radius, category, specialty) =>
    request('/api/places/google', { lat, lng, radius, category, specialty }),
}
