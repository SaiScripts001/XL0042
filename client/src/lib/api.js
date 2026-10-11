/** Thin client for the Express/Groq API (proxied through Vite in dev). */

async function request(path, body) {
  const res = await fetch(path, {
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
    const res = await fetch('/api/health')
    return res.json()
  },
  extract: (images, docTypeHint) => request('/api/extract', { images, docTypeHint }),
  summarize: (record, language) => request('/api/summarize', { record, language }),
  chat: (messages, profile, language, records) => request('/api/chat', { messages, profile, language, records }),
  guide: (diagnosis, context, language) => request('/api/guide', { diagnosis, context, language }),
  placesGoogle: (lat, lng, radius, category, specialty) =>
    request('/api/places/google', { lat, lng, radius, category, specialty }),
}
