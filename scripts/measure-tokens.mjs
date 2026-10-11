// Throwaway: measure real token usage per request so we can cut waste.
import 'dotenv/config'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const key = process.env.GROQ_API_KEY.trim()
const VISION = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b'

// A synthetic prescription, same shape as the one the user uploads
function makeImage(w, h) {
  const rows = 12
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#fff"/>`
  svg += `<text x="40" y="60" font-size="34" font-family="Georgia" fill="#111">Sunrise Clinic</text>`
  let y = 130
  for (let i = 0; i < rows; i++) {
    svg += `<text x="40" y="${y}" font-size="20" font-family="Georgia" fill="#222">Tab ${i + 1} 500 mg - 1-0-1 - ${30 + i} days - after food</text>`
    y += 38
  }
  svg += `<text x="40" y="${y + 30}" font-size="22" font-family="Georgia" fill="#111">Diagnosis: Type 2 Diabetes Mellitus (E11.9)</text></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

async function probe(label, payload) {
  const t0 = Date.now()
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000),
    })
    const json = await res.json()
    const secs = ((Date.now() - t0) / 1000).toFixed(1)
    const u = json.usage
    if (!res.ok) {
      console.log(`${label}: HTTP ${res.status} (${secs}s) ${String(json?.error?.message || '').slice(0, 110)}`)
      return
    }
    console.log(
      `${label}: OK (${secs}s) prompt=${u?.prompt_tokens} completion=${u?.completion_tokens} total=${u?.total_tokens}`,
    )
  } catch (err) {
    console.log(`${label}: ERROR ${err.message}`)
  }
}

const prompt =
  'Read this medical document image and extract it into STRICT JSON with keys: type, title, date, provider, patient, medicines[{name,dosage,frequency,duration,instructions}], labs[{test,value,unit,referenceRange,flag}], vitals, diagnoses, notes, transcription. Output only raw JSON.'

for (const [w, h] of [[800, 1000], [1280, 1600], [1600, 2000]]) {
  await probe(`vision ${w}x${h} max=2800`, {
    model: VISION,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: makeImage(w, h) } }] }],
    temperature: 0.1,
    max_tokens: 2800,
    response_format: { type: 'json_object' },
  })
}

await probe('vision 1280 max=1600', {
  model: VISION,
  messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: makeImage(1280, 1600) } }] }],
  temperature: 0.1,
  max_tokens: 1600,
  response_format: { type: 'json_object' },
})