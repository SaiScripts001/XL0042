import { AlertTriangle, CheckCircle2, FileQuestion, Info, Loader2 } from 'lucide-react'
import { useStore } from '../store.jsx'

export function Spinner({ size = 18, className = '' }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />
}

export function PageHeader({ eyebrow, title, sub, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="h-display text-3xl sm:text-[40px]">{title}</h1>
        {sub && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft sm:text-base">{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Status pill used across labs/vitals. */
export function FlagBadge({ flag }) {
  const { t } = useStore()
  const map = {
    normal: { cls: 'bg-ok/10 text-ok', Icon: CheckCircle2 },
    high: { cls: 'bg-warn/10 text-warn', Icon: AlertTriangle },
    low: { cls: 'bg-low/10 text-low', Icon: AlertTriangle },
    critical: { cls: 'bg-crit/15 text-crit', Icon: AlertTriangle },
    unknown: { cls: 'bg-line text-muted', Icon: Info },
  }
  const { cls, Icon } = map[flag] || map.unknown
  return (
    <span className={`chip ${cls}`}>
      <Icon size={13} />
      {t(`record.flag.${flag || 'unknown'}`)}
    </span>
  )
}

export function Toast() {
  const { toast, t } = useStore()
  if (!toast) return null
  const ok = toast.tone !== 'error'
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[1000] flex justify-center px-4">
      <div
        className={`pointer-events-auto flex items-center gap-2.5 rounded-full px-5 py-3 text-sm font-medium text-white shadow-pop ${
          ok ? 'bg-ink' : 'bg-crit'
        }`}
      >
        {ok ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
        {toast.message || t('common.saved')}
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon = FileQuestion, title, sub, action }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-8 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
        <Icon size={26} />
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {sub && <p className="max-w-sm text-sm leading-relaxed text-muted">{sub}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorNote({ children }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-crit/25 bg-crit/5 px-4 py-3 text-sm text-crit">
      <AlertTriangle size={17} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export function DisclaimBar() {
  const { t } = useStore()
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-[13px] leading-relaxed text-brand-700">
      <Info size={16} className="mt-0.5 shrink-0" />
      <span>{t('landing.disclaimShort')} {t('record.emergency')}</span>
    </p>
  )
}

/** Render an AI summary written with **bold** headings and "- " bullets. */
export function RichText({ text }) {
  if (!text) return null
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-ink-soft">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />
        const bullet = /^\s*[-*]\s+/.test(line)
        const content = renderBold(bullet ? line.replace(/^\s*[-*]\s+/, '') : line)
        return bullet ? (
          <div key={i} className="flex gap-2.5">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
            <p>{content}</p>
          </div>
        ) : (
          <p key={i}>{content}</p>
        )
      })}
    </div>
  )
}

function renderBold(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i} className="font-semibold text-ink">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  )
}
