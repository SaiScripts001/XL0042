import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import apiRouter from './routes/api.js'
import { hasApiKey } from './services/groq.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001

const app = express()
app.use(cors())
app.use(express.json({ limit: '25mb' })) // base64 document pages

app.use('/api', apiRouter)

// Production: serve the built React app from /dist
const distDir = path.resolve(__dirname, '../dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

// Central error handler → always a JSON body the UI can display
app.use((err, _req, res, _next) => {
  const status = err.status || 500
  if (status >= 500 && status !== 429) console.error('[api]', err)
  let message = err.message || 'Something went wrong.'
  if (status === 429) {
    // Groq free tier: 200K tokens/day — translate into words a patient understands
    message =
      'The AI is resting after many requests today (free daily limit reached). Please wait a few minutes and try again — your records are safe.'
  }
  res.status(status === 429 ? 429 : status).json({
    ok: false,
    error: message,
    detail: status === 429 ? undefined : err.detail,
  })
})

app.listen(PORT, () => {
  console.log(`\n  ⚕  Health Copilot API  →  http://localhost:${PORT}`)
  console.log(`   ${hasApiKey() ? '✓ GROQ_API_KEY loaded' : '⚠ GROQ_API_KEY missing — add it to .env and restart'}\n`)
})
