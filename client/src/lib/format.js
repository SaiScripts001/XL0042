import { LANGS } from './i18n.js'

export const LOCALES = Object.fromEntries(LANGS.map((l) => [l.code, `${l.code}-IN`]))

export function formatDate(value, lang = 'en', opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—'
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return String(value)
  try {
    return new Intl.DateTimeFormat(LOCALES[lang] || 'en-IN', opts).format(d)
  } catch {
    return d.toDateString()
  }
}

export function relTime(iso, lang = 'en') {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const diff = Math.max(0, Date.now() - then)
  const mins = Math.round(diff / 60000)
  const rtf = new Intl.RelativeTimeFormat(LOCALES[lang] || 'en-IN', { numeric: 'auto' })
  if (mins < 60) return rtf.format(-mins, 'minute')
  const hours = Math.round(mins / 60)
  if (hours < 24) return rtf.format(-hours, 'hour')
  return rtf.format(-Math.round(hours / 24), 'day')
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
