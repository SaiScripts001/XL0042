import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  ScanLine,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { ACCEPTED, MAX_BYTES, prepareDocument } from '../lib/files.js'
import { completeness, uncertainItems } from '../lib/explain.js'
import { useStore } from '../store.jsx'
import { DisclaimBar, ErrorNote, PageHeader, RichText } from '../components/ui.jsx'

const DOC_TYPES = [
  { value: 'auto', key: 'scan.auto' },
  { value: 'prescription', key: 'type.prescription' },
  { value: 'lab_report', key: 'type.lab_report' },
  { value: 'discharge_summary', key: 'type.discharge_summary' },
  { value: 'diagnostic_report', key: 'type.diagnostic_report' },
  { value: 'imaging_report', key: 'type.imaging_report' },
  { value: 'other', key: 'type.other' },
]

export default function Scan() {
  const { t, lang, addRecord, showToast } = useStore()
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const [dragging, setDragging] = useState(false)
  const [doc, setDoc] = useState(null)
  const [hint, setHint] = useState('auto')
  const [phase, setPhase] = useState('idle') // idle | working | review | error
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [hasKey, setHasKey] = useState(true)
  const [tab, setTab] = useState('form')

  useEffect(() => {
    let alive = true
    api.health().then((h) => alive && setHasKey(Boolean(h.hasKey))).catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const onFiles = useCallback(async (files) => {
    const file = files?.[0]
    if (!file) return
    if (file.size > MAX_BYTES) {
      setError(t('scan.errTooBig'))
      setPhase('error')
      return
    }
    if (!/image\//.test(file.type) && file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      setError(t('scan.errType'))
      setPhase('error')
      return
    }
    setError('')
    setPhase('working')
    setStep(0)
    try {
      const prepared = await prepareDocument(file)
      setDoc(prepared)
      setDraft(null)
      setPhase('idle')
    } catch (err) {
      setError(err.message || t('scan.errRead'))
      setPhase('error')
    }
  }, [])

  const analyze = async () => {
    if (!doc) return
    setPhase('working')
    setError('')
    setStep(1)
    try {
      const extracted = await api.extract(doc.pages, hint === 'auto' ? undefined : hint)
      setStep(2)
      let summary = ''
      try {
        const res = await api.summarize(extracted.data, lang)
        summary = res.summary
      } catch {
        summary = '' // summary failure must not block saving the extraction
      }
      setStep(3)
      setDraft({
        ...extracted.data,
        thumb: doc.thumb,
        source: doc.fileName,
        summary,
        summaryLang: summary ? lang : '',
        aiTokens: extracted.usage?.total || 0,
      })
      setPhase('review')
      setTab('form')
    } catch (err) {
      setError(err.message || t('scan.errAnalyze'))
      setPhase('error')
    }
  }

  const save = () => {
    if (!draft) return
    const rec = addRecord(draft)
    showToast(t('scan.saved'))
    navigate(`/record/${rec.id}`)
  }

  const reset = () => {
    setDoc(null)
    setDraft(null)
    setPhase('idle')
    setStep(0)
    setError('')
  }

  return (
    <div className="section py-12">
      <PageHeader
        eyebrow={
          <>
            <ScanLine size={14} /> {t('nav.scan')}
          </>
        }
        title={t('scan.title')}
        sub={t('scan.sub')}
      />

      {!hasKey && (
        <div className="mb-6">
          <ErrorNote>{t('scan.noKey')}</ErrorNote>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* ── Left: upload / preview / review ── */}
        <div className="space-y-5">
          {!doc && phase !== 'error' && (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                onFiles(e.dataTransfer.files)
              }}
              onClick={() => inputRef.current?.click()}
              className={`card flex cursor-pointer flex-col items-center justify-center gap-4 border-2 border-dashed px-8 py-20 text-center transition-colors ${
                dragging ? 'border-brand-400 bg-brand-50' : 'border-line hover:border-brand-300'
              }`}
            >
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-500">
                <UploadCloud size={30} />
              </span>
              <div>
                <p className="text-lg font-semibold text-ink">{t('scan.drop')}</p>
                <p className="mt-1 text-sm text-muted">{t('scan.dropHint')}</p>
              </div>
              <span className="btn-soft btn-sm">{t('scan.browse')}</span>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
            </div>
          )}

          {phase === 'error' && error && (
            <div className="card space-y-4 p-8">
              <ErrorNote>{error}</ErrorNote>
              <button type="button" onClick={reset} className="btn-soft btn-sm">
                {t('common.retry')}
              </button>
            </div>
          )}

          {doc && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-500">
                    {doc.isPdf ? <FileText size={17} /> : <ImageIcon size={17} />}
                  </span>
                  <div className="leading-tight">
                    <p className="max-w-[240px] truncate text-sm font-semibold text-ink">{doc.fileName}</p>
                    <p className="text-xs text-muted">
                      {t('scan.pages', { n: Math.min(doc.pages.length, doc.totalPages), total: doc.totalPages })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-line"
                  aria-label={t('common.cancel')}
                >
                  <X size={17} />
                </button>
              </div>

              <div className="flex flex-wrap gap-3 bg-canvas p-5">
                {doc.pages.map((p, i) => (
                  <img
                    key={i}
                    src={p}
                    alt={`${t('scan.preview')} ${i + 1}`}
                    className="h-40 rounded-xl border border-line bg-white object-contain shadow-card"
                  />
                ))}
              </div>

              <div className="space-y-4 border-t border-line p-5">
                <div>
                  <label className="label">{t('scan.docType')}</label>
                  <div className="flex flex-wrap gap-2">
                    {DOC_TYPES.map((dt) => (
                      <button
                        key={dt.value}
                        type="button"
                        onClick={() => setHint(dt.value)}
                        className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                          hint === dt.value
                            ? 'border-brand-500 bg-brand-500 text-white'
                            : 'border-line text-ink-soft hover:border-brand-300'
                        }`}
                      >
                        {t(dt.key)}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={analyze}
                  disabled={phase === 'working'}
                  className="btn-primary w-full sm:w-auto"
                >
                  {phase === 'working' ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
                  {t('scan.analyze')}
                </button>
              </div>
            </div>
          )}

          {/* Progress */}
          {phase === 'working' && doc && (
            <div className="card p-6">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Loader2 size={16} className="animate-spin text-brand-500" />
                {t('scan.processing')}
              </p>
              <ol className="mt-4 space-y-3">
                <ProgressStep done={step > 1} active={step === 1} label={t('scan.step1')} />
                <ProgressStep done={step > 2} active={step === 2} label={t('scan.step2')} />
                <ProgressStep done={false} active={step === 3} label={t('scan.step3')} />
              </ol>
            </div>
          )}

          {/* Review */}
          {phase === 'review' && draft && (
            <div className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-ink">{t('scan.review')}</h2>
                  <p className="text-sm text-muted">{t('scan.reviewSub')}</p>
                </div>
                <div className="flex rounded-full border border-line p-1">
                  <button
                    type="button"
                    onClick={() => setTab('form')}
                    className={`rounded-full px-4 py-1.5 text-[13px] font-semibold ${
                      tab === 'form' ? 'bg-ink text-white' : 'text-ink-soft'
                    }`}
                  >
                    {t('scan.review')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('summary')}
                    className={`rounded-full px-4 py-1.5 text-[13px] font-semibold ${
                      tab === 'summary' ? 'bg-ink text-white' : 'text-ink-soft'
                    }`}
                  >
                    {t('record.summary')}
                  </button>
                </div>
              </div>

              {tab === 'summary' ? (
                <div className="p-6">
                  {draft.summary ? (
                    <>
                      <p className="mb-4 text-xs text-muted">
                        {t('record.inLang', { lang: lang.toUpperCase() })}
                      </p>
                      <RichText text={draft.summary} />
                    </>
                  ) : (
                    <p className="text-sm text-muted">{t('record.noSummary')}</p>
                  )}
                </div>
              ) : (
                <>
                  <ExtractionAudit draft={draft} />
                  <ReviewForm draft={draft} setDraft={setDraft} />
                </>
              )}

              <div className="flex flex-wrap items-center gap-3 border-t border-line bg-canvas px-6 py-4">
                <button type="button" onClick={save} className="btn-primary">
                  <CheckCircle2 size={17} />
                  {t('scan.saveRecord')}
                </button>
                <button type="button" onClick={reset} className="btn-ghost">
                  {t('scan.analyzeAnother')}
                </button>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <AlertTriangle size={14} className="text-brand-500" />
                  {t('scan.ocrWarn')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right rail ── */}
        <aside className="space-y-5">
          <DisclaimBar />
          <div className="card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink">{t('landing.howTitle')}</h3>
            <ol className="mt-4 space-y-4">
              {[
                { n: 1, label: t('landing.s1t'), body: t('landing.s1d') },
                { n: 2, label: t('landing.s2t'), body: t('landing.s2d') },
                { n: 3, label: t('landing.s3t'), body: t('landing.s3d') },
                { n: 4, label: t('landing.s4t'), body: t('landing.s4d') },
              ].map((s) => (
                <li key={s.n} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600">
                    {s.n}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{s.label}</p>
                    <p className="text-[13px] leading-relaxed text-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink">{t('footer.product')}</h3>
            <button
              type="button"
              onClick={() => navigate('/timeline')}
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-medium text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600"
            >
              {t('scan.goToTimeline')}
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="mt-2 flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-medium text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600"
            >
              {t('record.askAI')}
              <ArrowRight size={16} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function ProgressStep({ done, active, label }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${
          done ? 'bg-ok text-white' : active ? 'bg-brand-500 text-white' : 'bg-line text-muted'
        }`}
      >
        {done ? <CheckCircle2 size={13} /> : active ? <Loader2 size={13} className="animate-spin" /> : ''}
      </span>
      <span className={`text-sm ${active || done ? 'font-medium text-ink' : 'text-muted'}`}>{label}</span>
    </li>
  )
}

/* ── Editable extraction review ─────────────────────────────────────────── */

/** Explainability panel: what the AI found, what's missing, what needs a human eye. */
function ExtractionAudit({ draft }) {
  const { t } = useStore()
  const [showText, setShowText] = useState(false)
  const checks = completeness(draft, t)
  const uncertain = uncertainItems(draft)
  const found = checks.filter((c) => c.ok).length

  return (
    <div className="border-b border-line bg-canvas px-6 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip bg-ink text-white">
          <ScanLine size={12} /> {t('scan.auditFound', { n: found, total: checks.length })}
        </span>
        {draft.aiTokens > 0 && (
          <span
            className="chip bg-brand-50 text-brand-700"
            title={t('scan.aiCostHint')}
          >
            <Sparkles size={12} /> {t('scan.aiCost', { n: draft.aiTokens.toLocaleString() })}
          </span>
        )}
        {checks.map((c) => (
          <span key={c.label} className={`chip ${c.ok ? 'bg-ok/10 text-ok' : 'bg-line text-muted'}`}>
            {c.ok ? <CheckCircle2 size={12} /> : <X size={12} />}
            {c.label}
            {c.count > 0 ? ` (${c.count})` : ''}
          </span>
        ))}
      </div>

      {uncertain.length > 0 && (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-xl border border-warn/30 bg-warn/5 px-3 py-2 text-[13px] text-warn">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            {t('scan.auditUncertain')}
            <br />
            <span className="font-medium">{uncertain.join(' · ')}</span>
          </span>
        </p>
      )}

      {draft.transcription && (
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => setShowText((v) => !v)}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
          >
            <FileText size={14} />
            {t('scan.auditText')}
            <span className={`transition-transform ${showText ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {showText && (
            <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-white p-4 font-mono text-xs leading-relaxed text-ink-soft">
              {draft.transcription}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

function ReviewForm({ draft, setDraft }) {
  const { t } = useStore()
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('scan.review')}>
          <input className="input" value={draft.title || ''} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label={t('record.date')}>
          <input
            type="date"
            className="input"
            value={draft.date || ''}
            onChange={(e) => set({ date: e.target.value })}
          />
        </Field>
        <Field label={t('record.doctor')}>
          <input
            className="input"
            value={draft.provider?.doctor || ''}
            onChange={(e) => set({ provider: { ...draft.provider, doctor: e.target.value } })}
          />
        </Field>
        <Field label={t('record.facility')}>
          <input
            className="input"
            value={draft.provider?.facility || ''}
            onChange={(e) => set({ provider: { ...draft.provider, facility: e.target.value } })}
          />
        </Field>
      </div>

      <RepeatSection
        title={t('scan.medicines')}
        rows={draft.medicines}
        empty={{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }}
        onChange={(medicines) => set({ medicines })}
        columns={[
          { key: 'name', label: t('record.med') },
          { key: 'dosage', label: t('record.dose'), small: true },
          { key: 'frequency', label: t('record.freq'), small: true },
          { key: 'duration', label: t('record.duration'), small: true },
          { key: 'instructions', label: t('record.how') },
        ]}
      />

      <RepeatSection
        title={t('scan.labs')}
        rows={draft.labs}
        empty={{ test: '', value: '', unit: '', referenceRange: '', flag: 'unknown' }}
        onChange={(labs) => set({ labs })}
        columns={[
          { key: 'test', label: t('record.test') },
          { key: 'value', label: t('record.value'), small: true },
          { key: 'unit', label: 'Unit', small: true },
          { key: 'referenceRange', label: t('record.range'), small: true },
          { key: 'flag', label: 'Flag', small: true, select: true },
        ]}
      />

      <RepeatSection
        title={t('scan.vitals')}
        rows={draft.vitals}
        empty={{ name: '', value: '', unit: '', flag: 'unknown' }}
        onChange={(vitals) => set({ vitals })}
        columns={[
          { key: 'name', label: t('record.test') },
          { key: 'value', label: t('record.value'), small: true },
          { key: 'unit', label: t('record.unit'), small: true },
          { key: 'flag', label: t('record.flag'), small: true, select: true },
        ]}
      />

      <RepeatSection
        title={t('scan.diagnoses')}
        rows={draft.diagnoses}
        empty={{ name: '', code: '' }}
        onChange={(diagnoses) => set({ diagnoses })}
        columns={[
          { key: 'name', label: t('scan.diagnoses') },
          { key: 'code', label: t('record.icd'), small: true },
        ]}
      />

      <Field label={t('scan.notes')}>
        <textarea
          className="input min-h-24"
          value={draft.notes || ''}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </Field>

      <Field label={t('scan.followUp')}>
        <input
          className="input"
          value={draft.followUp || ''}
          onChange={(e) => set({ followUp: e.target.value })}
          placeholder={t('scan.followUpPh')}
        />
      </Field>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

function RepeatSection({ title, rows = [], empty, onChange, columns }) {
  const { t } = useStore()

  const update = (i, key, value) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r))
    onChange(next)
  }

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <button
          type="button"
          onClick={() => onChange([...rows, { ...empty }])}
          className="flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
        >
          <Plus size={14} /> {t('common.add')}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-4 text-sm text-muted">
          {t('scan.noneFound')}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-3 ${row.uncertain ? 'border-warn/50 bg-warn/5' : 'border-line bg-canvas'}`}
            >
              {row.uncertain && (
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-warn">
                  <AlertTriangle size={13} /> {t('scan.needsCheck')}
                </p>
              )}
              <div className="grid gap-2.5 sm:grid-cols-2">
                {columns.map((col) => (
                  <div key={col.key} className={col.small ? '' : 'sm:col-span-2'}>
                    <label className="label mb-1 text-[10px]">{col.label}</label>
                    {col.select ? (
                      <select
                        className="input"
                        value={row[col.key] || 'unknown'}
                        onChange={(e) => update(i, col.key, e.target.value)}
                      >
                        <option value="normal">{t('record.flag.normal')}</option>
                        <option value="high">{t('record.flag.high')}</option>
                        <option value="low">{t('record.flag.low')}</option>
                        <option value="critical">{t('record.flag.critical')}</option>
                        <option value="unknown">{t('record.flag.unknown')}</option>
                      </select>
                    ) : (
                      <input
                        className="input"
                        value={row[col.key] || ''}
                        onChange={(e) => update(i, col.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                  className="flex items-center gap-1 text-xs font-medium text-crit/80 hover:text-crit"
                >
                  <Trash2 size={13} /> {t('common.remove')}
                </button>
                <button
                  type="button"
                  onClick={() => update(i, 'uncertain', !row.uncertain)}
                  className={`flex items-center gap-1 text-xs font-medium ${
                    row.uncertain ? 'text-ok hover:text-ok' : 'text-muted hover:text-warn'
                  }`}
                >
                  <CheckCircle2 size={13} />
                  {row.uncertain ? t('scan.markVerified') : t('scan.markUnsure')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
