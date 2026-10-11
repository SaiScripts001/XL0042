import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Bot,
  History,
  Loader2,
  MapPin,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Stethoscope,
  User,
  X,
} from 'lucide-react'
import { useStore } from '../store.jsx'
import { api } from '../lib/api.js'
import { useSpeech } from '../lib/speech.js'
import Logo from './Logo.jsx'

const PAGE_LABELS = {
  '/': 'Home',
  '/scan': 'Scan a document',
  '/timeline': 'Health timeline',
  '/hospitals': 'Hospitals map',
  '/chat': 'AI assistant',
  '/profile': 'Health profile',
}

/** Shared patient + app context for the assistant (records-grounded). */
export function buildAssistantContext(profile, records, currentPage = '') {
  return {
    name: profile.name,
    age: profile.age,
    gender: profile.gender,
    bloodGroup: profile.bloodGroup,
    conditions: profile.conditions,
    allergies: profile.allergies,
    abhaLinked: Boolean(profile.abha),
    recordCount: records.length,
    currentPage,
    currentPageLabel: PAGE_LABELS[currentPage] || currentPage || 'unknown',
    appLanguage: profile.appLanguage,
    timeline: records.slice(0, 8).map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      date: r.date,
      medicineCount: (r.medicines || []).length,
      labCount: (r.labs || []).length,
      hasSummary: Boolean(r.summary),
    })),
    recentSummaries: records.slice(0, 4).map((r) => ({
      type: r.type,
      title: r.title,
      date: r.date,
      medicines: (r.medicines || []).map((m) => m.name).filter(Boolean),
      flaggedLabs: (r.labs || [])
        .filter((l) => l.flag && l.flag !== 'normal')
        .map((l) => `${l.test}: ${l.value}${l.unit || ''} (${l.flag})`),
      summary: (r.summary || '').replace(/\*/g, '').slice(0, 400),
    })),
  }
}

const LINK_RE = /(\/hospitals\?[^\s\n]*|\/hospitals|\/scan|\/timeline|\/chat|\/profile)/g

/** Which internal page a link token points at. */
function linkTarget(part, t = (k) => k) {
  const hospitals = part.match(/^\/hospitals(\?specialty=([a-z]+))?$/)
  if (hospitals) {
    const spec = hospitals[2]
    return {
      to: part,
      Icon: MapPin,
      label: spec
        ? t('record.findCare', { specialty: t(`specialty.${spec}`) })
        : t('widget.linkHospitals'),
    }
  }
  const map = {
    '/scan': [Sparkles, 'widget.linkScan'],
    '/timeline': [History, 'widget.linkTimeline'],
    '/chat': [Bot, 'widget.linkChat'],
    '/profile': [User, 'widget.linkProfile'],
  }
  const hit = map[part]
  return hit ? { to: part, Icon: hit[0], label: t(hit[1]) } : null
}

/** Render assistant text, turning internal links into tappable buttons. */
export function AssistantMessage({ text, t = (k) => k }) {
  const parts = String(text || '').split(LINK_RE)
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        const target = linkTarget(part, t)
        if (!target) return <span key={i}>{part}</span>
        return (
          <Link
            key={i}
            to={target.to}
            className="my-1.5 flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-[13px] font-semibold text-white no-underline hover:bg-brand-600"
          >
            <target.Icon size={14} />
            {target.label}
          </Link>
        )
      })}
    </div>
  )
}

const STARTER_KEYS = [
  'widget.startReport',
  'widget.startDoctor',
  'widget.startExport',
  'widget.startTest',
]

export default function AssistantWidget() {
  const { t, lang, profile, records } = useStore()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)
  const inputRef = useRef(null)
  const speech = useSpeech(lang, { onFinal: (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)) })

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy, open])

  // Stop the mic when the panel closes so it never captures audio unseen
  useEffect(() => {
    if (!open && speech.listening) speech.stop()
  }, [open, speech.listening, speech])

  const send = useCallback(
    async (text) => {
      const content = (text ?? input).trim()
      if (!content || busy) return
      const next = [...messages, { role: 'user', content }]
      setMessages(next)
      setInput('')
      speech.stop()
      setBusy(true)
      setError('')
      try {
        const ctx = buildAssistantContext(profile, records, pathname)
        const res = await api.chat(next, ctx, lang, records)
        setMessages([...next, { role: 'assistant', content: res.reply, offline: res.offline }])
      } catch (err) {
        setError(err.message)
        setMessages(next)
      } finally {
        setBusy(false)
      }
    },
    [busy, input, messages, profile, records, pathname, lang, speech],
  )

  const toggleMic = () => {
    if (speech.listening) speech.stop()
    else speech.start()
  }

  return (
    <div className="fixed bottom-5 right-5 z-[900] flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[520px] w-[calc(100vw-40px)] max-w-[390px] flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-[#eef6ff] via-[#e6f1fe] to-[#dcecfe] shadow-pop ring-1 ring-brand-200/70">
          <div className="flex items-center gap-2.5 bg-ink px-4 py-3 text-white">
            <Logo size={26} />
            <div className="leading-tight">
              <p className="text-sm font-bold">{t('widget.title')}</p>
              <p className="text-[11px] opacity-70">{t('chat.sub')}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto grid h-8 w-8 place-items-center rounded-full text-white/80 hover:bg-white/10"
              aria-label={t('common.close')}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-[#eef6ff] via-[#e6f1fe] to-[#dcecfe] p-3.5">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2.5 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-500">
                  <Bot size={22} />
                </span>
                <p className="max-w-[250px] text-[13px] text-muted">{t('chat.empty')}</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {STARTER_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => send(t(key))}
                      className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brand-300 hover:text-brand-600"
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <span className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-100 px-3 py-2 text-[13px] leading-relaxed text-brand-800">
                    {m.content}
                  </span>
                </div>
              ) : (
                <div key={i} className="flex gap-2">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-white">
                    <Bot size={13} />
                  </span>
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-brand-200/60 bg-white/70 px-3 py-2 text-[13px] leading-relaxed text-ink-soft backdrop-blur-sm">
                    <AssistantMessage text={m.content} t={t} />
                    {m.offline && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 text-[10px] font-semibold text-warn">
                        {t('widget.offline')}
                      </span>
                    )}
                  </div>
                </div>
              ),
            )}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted">
                <Loader2 size={13} className="animate-spin text-brand-500" />
                {t('common.aiThinking')}
              </div>
            )}
            {error && <p className="rounded-xl bg-crit/10 px-3 py-2 text-xs text-crit">{error}</p>}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="flex items-center gap-2 border-t border-brand-200/70 bg-white/60 p-2.5 backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={toggleMic}
              disabled={busy}
              aria-label={speech.listening ? t('chat.stopVoice') : t('chat.voice')}
              title={speech.listening ? t('chat.stopVoice') : t('chat.voice')}
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-colors disabled:opacity-50 ${
                speech.listening
                  ? 'border-crit bg-crit/10 text-crit'
                  : 'border-line text-ink-soft hover:border-brand-300 hover:text-brand-600'
              }`}
            >
              {speech.listening ? <MicOff size={17} /> : <Mic size={17} />}
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={speech.listening ? t('chat.listening') : t('chat.placeholder')}
              className="input !py-2.5 text-[13px]"
            />
            <button type="submit" disabled={busy || !input.trim()} className="btn-primary h-10 w-10 shrink-0 !px-0">
              <Send size={15} />
            </button>
          </form>
          {speech.listening && <p className="sr-only" aria-live="polite">{t('chat.listening')}</p>}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('widget.title')}
        className={`grid h-14 w-14 place-items-center rounded-full text-white shadow-pop transition-transform hover:scale-105 active:scale-95 ${
          open ? 'bg-ink' : 'bg-brand-500'
        }`}
      >
        {open ? <X size={22} /> : <Stethoscope size={26} strokeWidth={2.2} />}
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-ok" />
          </span>
        )}
      </button>
    </div>
  )
}