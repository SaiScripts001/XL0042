import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bot,
  Eraser,
  FileUp,
  History,
  MessageSquare,
  Mic,
  MicOff,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { useStore } from '../store.jsx'
import { api } from '../lib/api.js'
import { ACCEPTED, MAX_BYTES, prepareDocument } from '../lib/files.js'
import { useSpeech, useSpeak } from '../lib/speech.js'
import { AssistantMessage, buildAssistantContext } from '../components/AssistantWidget.jsx'
import { ErrorNote } from '../components/ui.jsx'

const STARTERS = ['chat.starter1', 'chat.starter2', 'chat.starter3', 'chat.starter4']

/** Quick prompts that show the assistant is useful beyond medical records. */
const EXPLORE_STARTERS = [
  { label: 'chat.suggestApp', value: 'What can this app do? Show me each feature.' },
  { label: 'chat.suggestHealth', value: 'Explain a few common blood tests in simple words.' },
  { label: 'chat.suggestExport', value: 'How do I export my health records?' },
  { label: 'chat.suggestDoctor', value: 'Which kind of doctor should I see near me?' },
]

export default function Chat() {
  const { t, lang, profile, records, addRecord, chats, saveChat, deleteChat, showToast } = useStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [messages, setMessages] = useState([])
  const [chatId, setChatId] = useState(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyNote, setBusyNote] = useState('')
  const [error, setError] = useState('')
  const [attachments, setAttachments] = useState({})
  const [historyOpen, setHistoryOpen] = useState(false)
  const endRef = useRef(null)
  const fileRef = useRef(null)

  const speech = useSpeech(lang, {
    onFinal: useCallback((text) => setInput((prev) => (prev ? `${prev} ${text}` : text)), []),
  })
  const speaker = useSpeak(lang)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  const context = () => buildAssistantContext(profile, records, pathname)

  /* ── Persist the conversation so "recent chats" survives a refresh ── */
  const persist = useCallback(
    (msgs, id) => {
      if (!msgs.length || !id) return
      const firstUser = msgs.find((m) => m.role === 'user')
      saveChat({
        id,
        title: firstUser?.content?.slice(0, 60) || t('chat.newChat'),
        updatedAt: new Date().toISOString(),
        messages: msgs,
      })
    },
    [saveChat, t],
  )

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || busy) return

    const next = [...messages, { role: 'user', content }]
    const id = chatId || `chat_${Date.now().toString(36)}`
    setChatId(id)
    setMessages(next)
    setInput('')
    speech.stop()
    setBusy(true)
    setBusyNote('')
    setError('')
    persist(next, id)

    try {
      const res = await api.chat(next, context(), lang, records)
      const done = [...next, { role: 'assistant', content: res.reply, offline: res.offline }]
      setMessages(done)
      persist(done, id)
    } catch (err) {
      setError(err.message)
      setMessages(next)
    } finally {
      setBusy(false)
      setBusyNote('')
    }
  }

  const startNew = () => {
    speaker.stop()
    speech.stop()
    setMessages([])
    setChatId(null)
    setAttachments({})
    setError('')
    setHistoryOpen(false)
  }

  const openChat = (c) => {
    speaker.stop()
    speech.stop()
    setMessages(c.messages || [])
    setChatId(c.id)
    setAttachments({})
    setError('')
    setHistoryOpen(false)
  }

  /** Upload a document inside chat: extract it, then discuss it with the assistant. */
  const attachFile = async (file) => {
    if (!file || busy) return
    if (file.size > MAX_BYTES) {
      setError(t('chat.errTooBig'))
      return
    }
    const id = chatId || `chat_${Date.now().toString(36)}`
    setChatId(id)
    setBusy(true)
    setError('')
    try {
      setBusyNote(t('scan.step1'))
      const prepared = await prepareDocument(file)
      setBusyNote(t('scan.step2'))
      const extracted = await api.extract(prepared.pages)
      const draft = {
        ...extracted.data,
        thumb: prepared.thumb,
        source: `chat: ${prepared.fileName}`,
      }

      const compact = compactExtraction(draft, t)
      const userMsg = `${t('chat.uploadedDoc', { name: prepared.fileName })}\n${compact}\n${t('chat.uploadedAsk')}`
      const next = [...messages, { role: 'user', content: userMsg, file: prepared.thumb }]
      setMessages(next)
      setBusyNote(t('scan.step3'))
      const res = await api.chat(next, context(), lang, records)
      const done = [...next, { role: 'assistant', content: res.reply, offline: res.offline }]
      setMessages(done)
      setAttachments((a) => ({ ...a, [done.length - 1]: draft }))
      persist(done, id)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      setBusyNote('')
    }
  }

  const saveAttachment = (idx) => {
    const draft = attachments[idx]
    if (!draft) return
    const rec = addRecord(draft)
    setAttachments((a) => {
      const next = { ...a }
      delete next[idx]
      return next
    })
    showToast(t('scan.saved'))
    navigate(`/record/${rec.id}`)
  }

  return (
    <div className="section py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">
            <Sparkles size={14} /> {t('nav.assistant')}
          </p>
          <h1 className="h-display mt-3 text-3xl sm:text-[40px]">{t('chat.title')}</h1>
          <p className="mt-2 text-[15px] text-ink-soft">{t('chat.sub')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={startNew} className="btn-soft btn-sm">
            <Plus size={15} /> {t('chat.newChat')}
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="btn-ghost btn-sm"
            aria-expanded={historyOpen}
          >
            <History size={15} /> {t('chat.history')}
            {chats.length > 0 && (
              <span className="ml-1 rounded-full bg-brand-100 px-1.5 text-[10px] font-bold text-brand-700">
                {chats.length}
              </span>
            )}
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (chatId) deleteChat(chatId)
                startNew()
                showToast(t('chat.clear'))
              }}
              className="btn-ghost btn-sm"
            >
              <Eraser size={15} /> {t('chat.clear')}
            </button>
          )}
        </div>
      </div>

      {/* Recent conversations */}
      {historyOpen && (
        <div className="card mb-5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h3 className="text-sm font-semibold text-ink">{t('chat.recentChats')}</h3>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-canvas"
              aria-label={t('common.close')}
            >
              <X size={16} />
            </button>
          </div>
          {chats.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted">{t('chat.noChats')}</p>
          ) : (
            <ul className="max-h-72 divide-y divide-line overflow-y-auto">
              {chats.map((c) => (
                <li key={c.id} className="group flex items-center gap-3 px-5 py-3 hover:bg-canvas">
                  <button
                    type="button"
                    onClick={() => openChat(c)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium text-ink">{c.title}</p>
                    <p className="text-xs text-muted">
                      {c.messages?.length || 0} {t('chat.messages')} ·{' '}
                      {formatWhen(c.updatedAt, lang)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteChat(c.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted opacity-0 transition-opacity hover:bg-crit/10 hover:text-crit focus:opacity-100 group-hover:opacity-100"
                    aria-label={t('chat.deleteChat')}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="card flex h-[62vh] min-h-[440px] flex-col overflow-hidden">
        {/* Conversation */}
        <div className="flex-1 space-y-5 overflow-y-auto bg-canvas p-5 sm:p-6">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
                <MessageSquare size={26} />
              </span>
              <p className="max-w-sm text-sm text-muted">{t('chat.empty')}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {STARTERS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => send(t(key))}
                    className="rounded-full border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                {EXPLORE_STARTERS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => send(s.value)}
                    className="rounded-full bg-brand-50 px-4 py-2 text-[13px] font-medium text-brand-700 transition-colors hover:bg-brand-100"
                  >
                    {t(s.label)}
                  </button>
                ))}
              </div>
              {records.length === 0 && (
                <Link to="/scan" className="btn-soft btn-sm mt-1">
                  {t('timeline.upload')}
                </Link>
              )}
            </div>
          )}

          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <span className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-100 px-4 py-3 text-[14px] leading-relaxed text-brand-800">
                  {m.file && (
                    <img src={m.file} alt="" className="mb-2 max-h-40 rounded-xl object-contain" />
                  )}
                  {m.content}
                </span>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">
                  <Bot size={15} />
                </span>
                <div className="max-w-[80%] rounded-2xl rounded-bl-md border border-line bg-white px-4 py-3 text-[14px] leading-relaxed text-ink-soft">
                  <AssistantMessage text={m.content} t={t} />
                  {speaker.supported && (
                    <button
                      type="button"
                      onClick={() => speaker.speak(m.content)}
                      className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-brand-600 hover:text-brand-700"
                    >
                      <Volume2 size={14} /> {t('chat.listen')}
                    </button>
                  )}
                  {m.offline && (
                    <span className="mt-2 mr-2 inline-flex items-center gap-1 rounded-full bg-warn/10 px-2.5 py-1 text-[11px] font-semibold text-warn">
                      {t('chat.offline')}
                    </span>
                  )}
                  {attachments[i] && (
                    <button
                      type="button"
                      onClick={() => saveAttachment(i)}
                      className="btn-soft btn-sm mt-3"
                    >
                      <Save size={14} /> {t('scan.saveRecord')}
                    </button>
                  )}
                </div>
              </div>
            ),
          )}

          {busy && (
            <div className="flex gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-white">
                <Bot size={15} />
              </span>
              <div className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-muted">
                <span className="flex gap-1">
                  <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
                </span>
                {busyNote || t('common.aiThinking')}
              </div>
            </div>
          )}

          {error && <ErrorNote>{error}</ErrorNote>}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-line bg-white p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="flex items-end gap-2"
          >
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl border border-line text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"
              aria-label={t('chat.attach')}
              title={t('chat.attach')}
            >
              <FileUp size={18} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => {
                attachFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            {speech.supported && (
              <button
                type="button"
                onClick={speech.toggle}
                disabled={busy}
                aria-label={speech.listening ? t('chat.stopVoice') : t('chat.voice')}
                title={speech.listening ? t('chat.stopVoice') : t('chat.voice')}
                className={`grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl border transition-colors disabled:opacity-50 ${
                  speech.listening
                    ? 'border-crit bg-crit/10 text-crit'
                    : 'border-line text-ink-soft hover:border-brand-300 hover:text-brand-600'
                }`}
              >
                {speech.listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={1}
              placeholder={speech.listening ? t('chat.listening') : t('chat.placeholder')}
              className="input max-h-32 min-h-[46px] flex-1 resize-none py-3"
            />
            {speaker.supported && messages.length > 0 && (
              <button
                type="button"
                onClick={() => (speaker.speaking ? speaker.stop() : speaker.speak(messages.filter((m) => m.role === 'assistant').slice(-1)[0]?.content || ''))}
                disabled={busy || !messages.some((m) => m.role === 'assistant')}
                className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl border border-line text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"
                aria-label={speaker.speaking ? t('chat.stopReading') : t('chat.listen')}
                title={speaker.speaking ? t('chat.stopReading') : t('chat.listen')}
              >
                {speaker.speaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            )}
            <button type="submit" disabled={busy || !input.trim()} className="btn-primary h-[46px] px-5">
              <Send size={17} />
              <span className="hidden sm:inline">{t('chat.send')}</span>
            </button>
          </form>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <User size={12} /> {t('chat.disclaimer')}
          </p>
        </div>
      </div>
    </div>
  )
}

function Dot({ delay = '0s' }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400"
      style={{ animationDelay: delay, animationDuration: '1s' }}
    />
  )
}

/** "2 min ago" / "Yesterday" style timestamp for the chat history list. */
function formatWhen(iso, lang) {
  if (!iso) return ''
  const then = new Date(iso)
  const mins = Math.round((Date.now() - then.getTime()) / 60000)
  const rtf = new Intl.RelativeTimeFormat(lang || 'en', { numeric: 'auto' })
  if (mins < 1) return rtf.format(0, 'minute')
  if (mins < 60) return rtf.format(-mins, 'minute')
  const hours = Math.round(mins / 60)
  if (hours < 24) return rtf.format(-hours, 'hour')
  return rtf.format(-Math.round(hours / 24), 'day')
}

/** Compact structured view of an extraction, shown in the user bubble. */
function compactExtraction(draft, t = (k) => k) {
  const lines = []
  if (draft.title) lines.push(draft.title)
  if (draft.date) lines.push(`${t('chat.extractedDate')}: ${draft.date}`)
  const meds = (draft.medicines || []).map((m) => m.name).filter(Boolean)
  if (meds.length) lines.push(`${t('chat.extractedMeds')}: ${meds.join(', ')}`)
  const labs = (draft.labs || []).map((l) => `${l.test} ${l.value}${l.unit || ''} (${l.flag})`)
  if (labs.length) lines.push(`${t('chat.extractedLabs')}: ${labs.join('; ')}`)
  const dx = (draft.diagnoses || []).map((d) => d.name).filter(Boolean)
  if (dx.length) lines.push(`${t('chat.extractedDx')}: ${dx.join(', ')}`)
  return lines.join('\n')
}
