import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bot,
  Calendar,
  FileText,
  FlaskConical,
  Loader2,
  MapPin,
  MessageSquare,
  Pill,
  RefreshCw,
  Stethoscope,
  Trash2,
} from 'lucide-react'
import { useStore } from '../store.jsx'
import { api } from '../lib/api.js'
import { formatDate } from '../lib/format.js'
import { explainReading } from '../lib/explain.js'
import { specialtyForDiagnosis, specialtyKey } from '../lib/specialty.js'
import { DisclaimBar, EmptyState, ErrorNote, FlagBadge, PageHeader, RichText } from '../components/ui.jsx'

export default function RecordView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, lang, langs, profile, records, updateRecord, deleteRecord, showToast } = useStore()
  // guides loaded this session (persisted copies live on rec.guides)
  const [guides, setGuides] = useState({})
  const [guideOffline, setGuideOffline] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('summary')
  const [guideBusy, setGuideBusy] = useState('')
  const [guideError, setGuideError] = useState('')

  const rec = records.find((r) => r.id === id)

  if (!rec) {
    return (
      <div className="section py-16">
        <EmptyState
          icon={FileText}
          title={t('timeline.empty')}
          sub={t('timeline.emptySub')}
          action={
            <Link to="/scan" className="btn-primary btn-sm">
              {t('timeline.upload')}
            </Link>
          }
        />
      </div>
    )
  }

  const generate = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await api.summarize(rec, lang)
      updateRecord(rec.id, { summary: res.summary, summaryLang: lang, summaryOffline: res.offline })
      showToast(t('common.saved'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = () => {
    if (!window.confirm(t('timeline.deleteConfirm'))) return
    deleteRecord(rec.id)
    navigate('/timeline')
  }

  const loadGuide = async (dx) => {
    if (!dx?.name || guides[dx.name] || rec.guides?.[dx.name] || guideBusy) return
    setGuideBusy(dx.name)
    setGuideError('')
    try {
      const res = await api.guide(dx, {
        labs: rec.labs,
        medicines: rec.medicines,
        age: profile.age,
      }, lang)
      const next = { ...guides, [dx.name]: res.guide }
      const nextOffline = { ...guideOffline, [dx.name]: res.offline }
      setGuides(next)
      setGuideOffline(nextOffline)
      updateRecord(rec.id, { guides: next, guidesOffline: nextOffline })
    } catch (err) {
      setGuideError(err.message)
    } finally {
      setGuideBusy('')
    }
  }

  const langLabel = langs.find((l) => l.code === (rec.summaryLang || lang))?.native || lang.toUpperCase()
  const labs = rec.labs || []
  const vitals = rec.vitals || []
  const meds = rec.medicines || []
  const diagnoses = rec.diagnoses || []

  return (
    <div className="section py-12">
      <Link
        to="/timeline"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand-600"
      >
        <ArrowLeft size={16} /> {t('nav.timeline')}
      </Link>

      <PageHeader
        eyebrow={<span className="chip bg-brand-50 text-brand-700">{t(`type.${rec.type}`)}</span>}
        title={rec.title || t(`type.${rec.type}`)}
        sub={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} /> {formatDate(rec.date, lang)}
            </span>
            {rec.provider?.doctor && (
              <span className="inline-flex items-center gap-1.5">
                <Stethoscope size={14} /> {rec.provider.doctor}
              </span>
            )}
            {rec.provider?.facility && <span>{rec.provider.facility}</span>}
          </span>
        }
        actions={
          <button type="button" onClick={remove} className="btn-ghost btn-sm text-crit">
            <Trash2 size={15} /> {t('common.delete')}
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_330px]">
        <div className="card overflow-hidden">
          <div className="flex gap-1 border-b border-line p-2">
            {[
              { key: 'summary', label: t('record.summary') },
              { key: 'details', label: t('record.details') },
              { key: 'original', label: t('record.original') },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                  tab === item.key ? 'bg-ink text-white' : 'text-ink-soft hover:bg-canvas'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'summary' && (
            <div className="p-6">
              {error && (
                <div className="mb-4">
                  <ErrorNote>{error}</ErrorNote>
                </div>
              )}
              {rec.summary ? (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      {t('record.inLang', { lang: langLabel })}
                      {rec.summaryOffline && (
                        <span className="rounded-full bg-warn/10 px-2 py-0.5 text-[10px] font-semibold text-warn">
                          {t('record.offlineTemplate')}
                        </span>
                      )}
                    </p>
                    <button type="button" onClick={generate} disabled={busy} className="btn-soft btn-sm">
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      {t('record.regen')}
                    </button>
                  </div>
                  <RichText text={rec.summary} />
                </>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted">{t('record.noSummary')}</p>
                  <button type="button" onClick={generate} disabled={busy} className="btn-primary mt-5">
                    {busy ? <Loader2 size={17} className="animate-spin" /> : <Bot size={17} />}
                    {busy ? t('record.generating') : t('record.generate')}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'details' && (
            <div className="divide-y divide-line">
              {meds.length > 0 && (
                <Section title={t('scan.medicines')} Icon={Pill}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-muted">
                          <th className="pb-2 pr-4">{t('record.med')}</th>
                          <th className="pb-2 pr-4">{t('record.dose')}</th>
                          <th className="pb-2 pr-4">{t('record.freq')}</th>
                          <th className="pb-2 pr-4">{t('record.duration')}</th>
                          <th className="pb-2">{t('record.how')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {meds.map((m, i) => (
                          <tr key={i}>
                            <td className="py-2.5 pr-4 font-medium text-ink">
                              {m.name}
                              {m.uncertain && (
                                <span className="chip ml-2 bg-warn/10 text-warn">⚠ {t('scan.needsCheck')}</span>
                              )}
                            </td>
                            <td className="py-2.5 pr-4 text-ink-soft">{m.dosage || '—'}</td>
                            <td className="py-2.5 pr-4 text-ink-soft">{m.frequency || '—'}</td>
                            <td className="py-2.5 pr-4 text-ink-soft">{m.duration || '—'}</td>
                            <td className="py-2.5 text-ink-soft">{m.instructions || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}

              {labs.length > 0 && (
                <Section title={t('scan.labs')} Icon={FlaskConical}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-muted">
                          <th className="pb-2 pr-4">{t('record.test')}</th>
                          <th className="pb-2 pr-4">{t('record.value')}</th>
                          <th className="pb-2 pr-4">{t('record.range')}</th>
                          <th className="pb-2">{t('record.status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {labs.map((l, i) => (
                          <tr key={i}>
                            <td className="py-2.5 pr-4 font-medium text-ink">
                              {l.test}
                              {l.uncertain && (
                                <span className="chip ml-2 bg-warn/10 text-warn">⚠ {t('scan.needsCheck')}</span>
                              )}
                              <p className="mt-1 max-w-[280px] text-xs font-normal leading-relaxed text-muted">
                                {explainReading(l, t)}
                              </p>
                            </td>
                            <td className="py-2.5 pr-4">
                              <span className="font-semibold text-ink">
                                {l.value}
                                {l.unit ? <span className="ml-1 text-xs text-muted">{l.unit}</span> : null}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-ink-soft">{l.referenceRange || '—'}</td>
                            <td className="py-2.5">
                              <FlagBadge flag={l.flag} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}

              {vitals.length > 0 && (
                <Section title={t('scan.vitals')} Icon={FlaskConical}>
                  <ul className="space-y-2 text-sm">
                    {vitals.map((v, i) => (
                      <li key={i} className="flex items-center justify-between rounded-xl bg-canvas px-4 py-2.5">
                        <span className="font-medium text-ink">{v.name}</span>
                        <span className="flex items-center gap-3">
                          <span className="text-ink-soft">
                            {v.value} {v.unit}
                          </span>
                          <FlagBadge flag={v.flag} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {diagnoses.length > 0 && (
                <Section title={t('scan.diagnoses')} Icon={Stethoscope}>
                  <div className="space-y-3">
                    {diagnoses.map((d, i) => {
                      const spec = specialtyForDiagnosis(d.name)
                      const guide = guides[d.name] || rec.guides?.[d.name]
                      return (
                        <div key={i} className="rounded-2xl border border-line bg-canvas p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-ink">
                              {d.name}
                              {d.code && <span className="ml-2 text-xs font-normal text-muted">({d.code})</span>}
                            </p>
                            <span className="chip bg-brand-50 text-brand-700">
                              <Stethoscope size={12} /> {t(specialtyKey(spec))}
                            </span>
                          </div>
                          {!guide ? (
                            <button
                              type="button"
                              onClick={() => loadGuide(d)}
                              disabled={guideBusy === d.name}
                              className="btn-soft btn-sm mt-3"
                            >
                              {guideBusy === d.name ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Bot size={14} />
                              )}
                              {guideBusy === d.name ? t('record.generating') : t('record.guideBtn')}
                            </button>
                          ) : (
                            <div className="mt-3 rounded-xl border border-line bg-white p-4">
                              <RichText text={guide} />
                              {(guideOffline[d.name] || rec.guidesOffline?.[d.name]) && (
                                <span className="mt-2 inline-flex rounded-full bg-warn/10 px-2 py-0.5 text-[10px] font-semibold text-warn">
                                  {t('record.offlineTemplate')}
                                </span>
                              )}
                              <Link
                                to={`/hospitals?specialty=${spec}`}
                                className="btn-primary btn-sm mt-4"
                              >
                                <MapPin size={14} /> {t('record.findCare', { specialty: t(specialtyKey(spec)) })}
                              </Link>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {guideError && (
                      <div className="mt-2">
                        <ErrorNote>{guideError}</ErrorNote>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {rec.followUp && (
                <Section title={t('scan.followUp')} Icon={Calendar}>
                  <p className="text-sm leading-relaxed text-ink-soft">{rec.followUp}</p>
                </Section>
              )}

              {rec.notes && (
                <Section title={t('scan.notes')} icon={FileText}>
                  <p className="text-sm leading-relaxed text-ink-soft">{rec.notes}</p>
                </Section>
              )}

              {rec.transcription && (
                <Section title={t('scan.auditText')} Icon={FileText}>
                  <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-canvas p-4 font-mono text-xs leading-relaxed text-ink-soft">
                    {rec.transcription}
                  </pre>
                </Section>
              )}

              {meds.length + labs.length + vitals.length + diagnoses.length === 0 && !rec.notes && (
                <div className="p-8 text-center text-sm text-muted">{t('scan.noneFound')}</div>
              )}
            </div>
          )}

          {tab === 'original' && (
            <div className="p-6">
              {rec.thumb ? (
                <img
                  src={rec.thumb}
                  alt={rec.title}
                  className="mx-auto max-h-[70vh] rounded-2xl border border-line object-contain"
                />
              ) : (
                <p className="py-8 text-center text-sm text-muted">{t('scan.noneFound')}</p>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <DisclaimBar />
          <div className="card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink">{t('record.askAI')}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {labs[0] ? t('record.askAbout', { test: labs[0].test }) : t('chat.sub')}
            </p>
            <Link to="/chat" className="btn-primary mt-4 w-full">
              <MessageSquare size={16} /> {t('chat.title')}
            </Link>
          </div>
          {rec.source && rec.source !== 'sample' && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink">{t('record.original')}</h3>
              <p className="mt-2 truncate text-[13px] text-muted">{rec.source}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function Section({ title, children, Icon }) {
  return (
    <section className="p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink">
        {Icon && <Icon size={15} className="text-brand-500" />}
        {title}
      </h3>
      {children}
    </section>
  )
}
