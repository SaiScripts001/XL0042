import { CalendarClock, FileText, HeartPulse, Hospital, Pill, ScanLine, Sparkles } from 'lucide-react'
import { useStore } from '../store.jsx'

/** CSS-drawn app screens used on the landing page (no image assets needed). */
export function PhoneShell({ children, className = '' }) {
  return (
    <div className={`phone ${className}`}>
      <div className="phone-screen">
        <div className="flex items-center justify-between bg-white px-4 pb-1 pt-3 text-[10px] font-semibold text-ink">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
            <span className="h-1.5 w-4 rounded-full bg-line" />
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

export function HomeMock() {
  const { t } = useStore()

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-3 overflow-hidden bg-canvas p-3.5">
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-3.5 text-white">
          <p className="text-[10px] opacity-80">{t('mock.greeting')}</p>
          <p className="text-[15px] font-bold leading-tight">Ananya Sharma</p>
          <div className="mt-3 flex gap-2">
            <MiniStat value="3" label={t('nav.timeline')} />
            <MiniStat value="7" label={t('timeline.title')} />
          </div>
        </div>

        <p className="px-0.5 text-[11px] font-semibold text-ink">{t('mock.quickActions')}</p>
        <div className="grid grid-cols-3 gap-2">
          <QuickAction Icon={ScanLine} label={t('nav.scan')} />
          <QuickAction Icon={CalendarClock} label={t('nav.timeline')} />
          <QuickAction Icon={Hospital} label={t('nav.hospitals')} />
        </div>

        <p className="px-0.5 text-[11px] font-semibold text-ink">{t('mock.today')}</p>
        <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-white p-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand-500">
            <Pill size={15} />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-semibold text-ink">Metformin 500 mg</p>
            <p className="text-[10px] text-muted">After breakfast</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-white p-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-ok/10 text-ok">
            <FileText size={15} />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-semibold text-ink">{t('mock.lipidReady')}</p>
            <p className="text-[10px] text-muted">{t('mock.flagged')}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-around border-t border-line bg-white py-2.5 text-muted">
        <ScanLine size={16} className="text-brand-500" />
        <CalendarClock size={16} />
        <Sparkles size={16} />
        <HeartPulse size={16} />
      </div>
    </PhoneShell>
  )
}

export function TimelineMock() {
  const { t } = useStore()
  const rows = [
    { color: 'bg-brand-500', Icon: FileText, title: t('mock.lipidReady'), sub: 'Central Pathology · ' + t('mock.flagged') },
    { color: 'bg-ok', Icon: Pill, title: t('type.prescription'), sub: 'Dr. Meera Patel - ' + t('mock.rx') },
    { color: 'bg-low', Icon: Hospital, title: t('type.discharge_summary'), sub: 'Apollo - Stable' },
  ]
  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col gap-3 overflow-hidden bg-canvas p-3.5">
        <p className="text-[15px] font-bold text-ink">{t('timeline.title')}</p>
        <div className="flex gap-1.5">
          {[t('mock.all'), t('mock.labs'), t('mock.rx')].map((f, i) => (
            <span
              key={f}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                i === 0 ? 'bg-ink text-white' : 'bg-white text-muted'
              }`}
            >
              {f}
            </span>
          ))}
        </div>
        <div className="relative flex-1 pl-4">
          <span className="absolute left-[5px] top-2 h-[calc(100%-16px)] w-px bg-line" />
          {rows.map(({ color, Icon, title, sub }) => (
            <div key={title} className="relative mb-2.5 rounded-2xl border border-line bg-white p-2.5">
              <span className={`absolute -left-[13px] top-3.5 h-2.5 w-2.5 rounded-full ring-4 ring-canvas ${color}`} />
              <div className="flex items-center gap-2">
                <Icon size={14} className="text-ink-soft" />
                <div className="leading-tight">
                  <p className="text-[11px] font-semibold text-ink">{title}</p>
                  <p className="text-[10px] text-muted">{sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  )
}

export function ChatMock() {
  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col overflow-hidden bg-white p-3.5">
        <p className="text-center text-[10px] font-medium text-muted">Mon, 9 March 2026</p>
        <div className="mt-3 flex justify-end">
          <span className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-100 px-3 py-2 text-[11px] font-medium text-brand-800">
            My HbA1c is 8.2 â€” what does that mean?
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[9px] font-bold text-white">
            Ayu
          </span>
          <div className="rounded-2xl rounded-bl-md bg-canvas px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
            HbA1c shows your average blood sugar over about 3 months. Your report lists the normal range as
            4.0â€“5.6%, so 8.2% is above it.
            <br />
            <br />
            It is worth discussing at your next visit â€” please do not change any medicine on your own.
            <div className="mt-2 rounded-lg bg-brand-50 px-2 py-1 text-[9px] text-brand-700">
              â“˜ AI-generated â€” for information only
            </div>
          </div>
        </div>
        <div className="mt-auto flex items-center gap-2 rounded-full border border-line px-3 py-2 text-[10px] text-muted">
          Ask about your reportsâ€¦
          <span className="ml-auto grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-white">â†‘</span>
        </div>
      </div>
    </PhoneShell>
  )
}

function MiniStat({ value, label }) {
  return (
    <div className="flex-1 rounded-xl bg-white/15 px-2 py-1.5 backdrop-blur">
      <p className="text-[13px] font-bold leading-none">{value}</p>
      <p className="text-[9px] opacity-80">{label}</p>
    </div>
  )
}

function QuickAction({ Icon, label }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-white py-2.5">
      <Icon size={15} className="text-brand-500" />
      <span className="text-[9px] font-semibold text-ink-soft">{label}</span>
    </div>
  )
}
