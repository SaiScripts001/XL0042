import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarRange,
  Download,
  FileText,
  FlaskConical,
  HeartPulse,
  Pill,
  Search,
  Stethoscope,
  TestTube2,
  Trash2,
  Upload,
} from 'lucide-react'
import { useStore } from '../store.jsx'
import { formatDate } from '../lib/format.js'
import { toFhirBundle } from '../lib/fhir.js'
import { downloadJson } from '../lib/format.js'
import { EmptyState, PageHeader } from '../components/ui.jsx'

const TYPE_META = {
  prescription: { Icon: Pill, tone: 'bg-brand-50 text-brand-600' },
  lab_report: { Icon: FlaskConical, tone: 'bg-ok/10 text-ok' },
  discharge_summary: { Icon: Stethoscope, tone: 'bg-low/10 text-low' },
  diagnostic_report: { Icon: TestTube2, tone: 'bg-ink/5 text-ink' },
  imaging_report: { Icon: HeartPulse, tone: 'bg-warn/10 text-warn' },
  other: { Icon: FileText, tone: 'bg-line text-muted' },
}

export default function Timeline() {
  const { t, lang, records, profile, deleteRecord, loadSample, showToast } = useStore()
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')

  const stats = useMemo(() => {
    const meds = new Set()
    let flagged = 0
    const conditions = new Set(profile.conditions || [])
    for (const r of records) {
      for (const m of r.medicines || []) if (m.name) meds.add(m.name.toLowerCase())
      for (const l of r.labs || []) if (l.flag && l.flag !== 'normal' && l.flag !== 'unknown') flagged++
      for (const v of r.vitals || []) if (v.flag && v.flag !== 'normal' && v.flag !== 'unknown') flagged++
      for (const d of r.diagnoses || []) if (d.name) conditions.add(d.name)
    }
    return { meds: meds.size, flagged, conditions: conditions.size }
  }, [records, profile])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return records
      .filter((r) => (filter === 'all' ? true : r.type === filter))
      .filter((r) => {
        if (!needle) return true
        const hay = [
          r.title,
          r.provider?.doctor,
          r.provider?.facility,
          ...(r.medicines || []).map((m) => m.name),
          ...(r.labs || []).map((l) => l.test),
          ...(r.diagnoses || []).map((d) => d.name),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
      .sort((a, b) => String(b.date || b.createdAt).localeCompare(String(a.date || a.createdAt)))
  }, [records, filter, q])

  const exportBundle = () => {
    downloadJson('ayu-health-fhir-bundle.json', toFhirBundle(profile, records))
    showToast(t('profile.export'))
  }

  if (records.length === 0) {
    return (
      <div className="section py-12">
        <PageHeader eyebrow={<CalendarRange size={14} />} title={t('timeline.title')} sub={t('timeline.sub')} />
        <EmptyState
          icon={CalendarRange}
          title={t('timeline.empty')}
          sub={t('timeline.emptySub')}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/scan" className="btn-primary btn-sm">
                <Upload size={16} /> {t('timeline.upload')}
              </Link>
              <button type="button" onClick={loadSample} className="btn-ghost btn-sm">
                {t('timeline.loadSample')}
              </button>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="section py-12">
      <PageHeader
        eyebrow={<CalendarRange size={14} />}
        title={t('timeline.title')}
        sub={t('timeline.sub')}
        actions={
          <>
            <button type="button" onClick={exportBundle} className="btn-ghost btn-sm">
              <Download size={15} /> {t('timeline.exportAll')}
            </button>
            <Link to="/scan" className="btn-primary btn-sm">
              <Upload size={15} /> {t('timeline.upload')}
            </Link>
          </>
        }
      />

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard value={records.length} label={t('timeline.records')} Icon={FileText} tone="bg-brand-50 text-brand-600" />
        <StatCard value={stats.meds} label={t('timeline.activeMeds')} Icon={Pill} tone="bg-ink/5 text-ink" />
        <StatCard
          value={stats.flagged}
          label={t('timeline.abnormal')}
          Icon={AlertTriangle}
          tone={stats.flagged ? 'bg-warn/10 text-warn' : 'bg-ok/10 text-ok'}
        />
        <StatCard value={stats.conditions} label={t('timeline.conditions')} Icon={HeartPulse} tone="bg-ok/10 text-ok" />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-10"
            placeholder={t('timeline.search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', ...Object.keys(TYPE_META)].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                filter === type ? 'border-brand-500 bg-brand-500 text-white' : 'border-line text-ink-soft hover:border-brand-300'
              }`}
            >
              {type === 'all' ? t('common.all') : t(`type.${type}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {visible.length === 0 ? (
        <EmptyState icon={Search} title={t('timeline.noMatch')} sub={t('timeline.search')} />
      ) : (
        <div className="relative pl-5 sm:pl-8">
          <span className="absolute bottom-4 left-[9px] top-4 w-px bg-line sm:left-[15px]" />
          <div className="space-y-4">
            {visible.map((rec) => (
              <TimelineRow key={rec.id} rec={rec} onDelete={() => deleteRecord(rec.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TimelineRow({ rec, onDelete }) {
  const { t, lang } = useStore()
  const meta = TYPE_META[rec.type] || TYPE_META.other
  const { Icon, tone } = meta
  const flagged = [...(rec.labs || []), ...(rec.vitals || [])].filter(
    (v) => v.flag && v.flag !== 'normal' && v.flag !== 'unknown',
  ).length

  return (
    <div className="group relative rounded-2xl border border-line bg-white p-4 transition-all hover:border-brand-200 hover:shadow-card sm:p-5">
      <span
        className={`absolute -left-5 top-6 grid h-6 w-6 place-items-center rounded-full ring-4 ring-white sm:-left-8 sm:h-8 sm:w-8 ${tone}`}
      >
        <Icon size={14} />
      </span>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-canvas text-ink-soft">{t(`type.${rec.type}`)}</span>
            <span className="text-xs text-muted">{formatDate(rec.date, lang)}</span>
            {flagged > 0 && (
              <span className="chip bg-warn/10 text-warn">
                <AlertTriangle size={12} /> {flagged}
              </span>
            )}
            {rec.summary && <span className="chip bg-ok/10 text-ok">{t('timeline.aiSummary')}</span>}
          </div>
          <h3 className="mt-2 truncate text-[17px] font-semibold text-ink">{rec.title || t(`type.${rec.type}`)}</h3>
          <p className="mt-0.5 text-sm text-muted">
            {[rec.provider?.doctor, rec.provider?.facility].filter(Boolean).join(' · ') || '—'}
          </p>

          {(rec.medicines?.length > 0 || rec.labs?.length > 0) && (
            <p className="mt-2 line-clamp-1 text-[13px] text-ink-soft">
              {rec.medicines?.slice(0, 3).map((m) => m.name).filter(Boolean).join(', ')}
              {rec.labs?.length > 0 && (rec.medicines?.length ? ' · ' : '')}
              {rec.labs?.slice(0, 3).map((l) => `${l.test} ${l.value}${l.unit ? ` ${l.unit}` : ''}`).join(' · ')}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link to={`/record/${rec.id}`} className="btn-soft btn-sm">
            {t('timeline.showRecord')}
          </Link>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('common.delete')}
            className="grid h-9 w-9 place-items-center rounded-full text-muted opacity-0 transition-all hover:bg-crit/10 hover:text-crit group-hover:opacity-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ value, label, Icon, tone }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-2xl font-extrabold leading-none text-ink">{value}</p>
        <p className="mt-1 text-[13px] text-muted">{label}</p>
      </div>
    </div>
  )
}
