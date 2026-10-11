import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bot,
  CalendarRange,
  FileScan,
  Globe2,
  HeartHandshake,
  Hospital,
  Languages,
  Layers,
  MapPin,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react'
import { ChatMock, HomeMock, TimelineMock } from '../components/Mockups.jsx'
import { useStore } from '../store.jsx'

export default function Landing() {
  const { t } = useStore()

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="section relative flex flex-col items-center pb-8 pt-14 text-center sm:pt-20">
          <p className="eyebrow">
            <Sparkles size={14} />
            {t('landing.badge')}
          </p>

          <h1 className="h-display mt-6 max-w-4xl text-[38px] sm:text-[58px] lg:text-[68px]">
            {t('landing.title')}
          </h1>

          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-ink-soft sm:text-lg">
            {t('landing.sub')}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/scan" className="btn-primary text-[15px]">
              {t('landing.ctaPrimary')}
              <ArrowRight size={17} />
            </Link>
            <Link to="/timeline" className="btn-ghost text-[15px]">
              {t('landing.ctaSecondary')}
            </Link>
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-sm text-muted">
            <ShieldCheck size={15} className="text-ok" />
            {t('landing.trust')}
          </p>

          {/* Phone mockups */}
          <div className="relative mt-14 flex w-full items-start justify-center gap-5 sm:gap-8">
            <div className="floaty hidden opacity-90 sm:block" style={{ animationDelay: '-1.2s' }}>
              <div className="hidden rotate-[-4deg] md:block">
                <TimelineMock />
              </div>
            </div>
            <div className="z-10 scale-[1.06] sm:scale-110">
              <HomeMock />
            </div>
            <div className="floaty hidden opacity-90 sm:block" style={{ animationDelay: '-3s' }}>
              <div className="hidden rotate-[4deg] md:block">
                <ChatMock />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stat strip ───────────────────────────────────────────────────── */}
      <section className="section mt-16">
        <div className="card grid grid-cols-2 divide-line gap-px overflow-hidden bg-line md:grid-cols-4">
          <Stat value="4" label={t('landing.langSub')} small />
          <Stat value="OCR" label={t('landing.f1t')} />
          <Stat value="FHIR" label="ABDM-ready data model" />
          <Stat value="100%" label={t('landing.trust')} />
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="section mt-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow justify-self-center">
            <Stethoscope size={14} />
            {t('footer.product')}
          </p>
          <h2 className="h-display mt-4 text-3xl sm:text-[42px]">{t('landing.featTitle')}</h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">{t('landing.featSub')}</p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Feature Icon={FileScan} title={t('landing.f1t')} body={t('landing.f1d')} tone="brand" />
          <Feature Icon={Sparkles} title={t('landing.f2t')} body={t('landing.f2d')} tone="mint" />
          <Feature Icon={CalendarRange} title={t('landing.f3t')} body={t('landing.f3d')} tone="ink" />
          <Feature Icon={Bot} title={t('landing.f4t')} body={t('landing.f4d')} tone="brand" />
          <Feature Icon={MapPin} title={t('landing.f5t')} body={t('landing.f5d')} tone="mint" />
          <Feature Icon={ShieldCheck} title={t('landing.f6t')} body={t('landing.f6d')} tone="ink" />
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="mt-24 bg-canvas py-20">
        <div className="section">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow justify-self-center">
              <Layers size={14} />
              Pipeline
            </p>
            <h2 className="h-display mt-4 text-3xl sm:text-[42px]">{t('landing.howTitle')}</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">{t('landing.howSub')}</p>
          </div>

          <div className="relative mt-14 grid gap-6 md:grid-cols-4">
            <span className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-line md:block" />
            <Step n={1} title={t('landing.s1t')} body={t('landing.s1d')} Icon={ScanLine} />
            <Step n={2} title={t('landing.s2t')} body={t('landing.s2d')} Icon={FileScan} />
            <Step n={3} title={t('landing.s3t')} body={t('landing.s3d')} Icon={Languages} />
            <Step n={4} title={t('landing.s4t')} body={t('landing.s4d')} Icon={CalendarRange} />
          </div>
        </div>
      </section>

      {/* ── Languages ────────────────────────────────────────────────────── */}
      <section className="section mt-24">
        <div className="card grid items-center gap-10 overflow-hidden p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">
              <Languages size={14} />
              Multi-language
            </p>
            <h2 className="h-display mt-4 text-3xl sm:text-[38px]">{t('landing.langTitle')}</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{t('landing.langSub')}</p>
            <Link to="/scan" className="btn-primary mt-7">
              {t('landing.ctaPrimary')}
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { code: 'EN', native: 'English', sample: 'Your report is ready' },
              { code: 'हि', native: 'हिन्दी', sample: 'आपकी रिपोर्ट तैयार है' },
              { code: 'తె', native: 'తెలుగు', sample: 'మీ రిపోర్టు సిద్ధంగా ఉంది' },
              { code: 'த', native: 'தமிழ்', sample: 'உங்கள் அறிக்கை தயார்' },
            ].map((l) => (
              <div key={l.code} className="rounded-2xl border border-line bg-canvas p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-sm font-bold text-white">
                  {l.code}
                </span>
                <p className="mt-3 font-semibold text-ink">{l.native}</p>
                <p className="text-sm text-muted">{l.sample}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hospitals ────────────────────────────────────────────────────── */}
      <section className="section mt-16">
        <div className="card grid items-center gap-8 overflow-hidden p-8 sm:p-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow">
              <Hospital size={14} />
              {t('hospitals.title')}
            </p>
            <h2 className="h-display mt-4 text-3xl sm:text-[38px]">{t('landing.hospTitle')}</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{t('landing.hospSub')}</p>
            <Link to="/hospitals" className="btn-primary mt-7">
              <MapPin size={16} />
              {t('hospitals.useLocation')}
            </Link>
          </div>
          <div className="relative h-64 overflow-hidden rounded-2xl border border-line bg-canvas">
            <MapArt />
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="section mt-20">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-16 text-center text-white">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-white/10" />
          <HeartHandshake className="mx-auto mb-5" size={34} />
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-[42px]">
            {t('landing.ctaTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">{t('landing.ctaSub')}</p>
          <Link
            to="/scan"
            className="btn mt-8 bg-white px-7 py-3.5 text-brand-700 hover:bg-brand-50 active:scale-[.98]"
          >
            {t('landing.ctaBtn')}
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </>
  )
}

function Stat({ value, label }) {
  return (
    <div className="bg-white px-6 py-7 text-center">
      <p className="text-3xl font-extrabold text-brand-500">{value}</p>
      <p className="mt-1.5 text-[13px] leading-snug text-muted">{label}</p>
    </div>
  )
}

const TONES = {
  brand: 'bg-brand-50 text-brand-500',
  mint: 'bg-ok/10 text-ok',
  ink: 'bg-ink/5 text-ink',
}

function Feature({ Icon, title, body, tone }) {
  return (
    <div className="card group p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-pop">
      <span className={`grid h-12 w-12 place-items-center rounded-2xl ${TONES[tone]}`}>
        <Icon size={22} />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{body}</p>
    </div>
  )
}

function Step({ n, title, body, Icon }) {
  return (
    <div className="relative text-center">
      <span className="relative z-10 mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white text-brand-500 shadow-card">
        <Icon size={22} />
      </span>
      <p className="mt-4 text-xs font-bold uppercase tracking-widest text-brand-500">Step {n}</p>
      <h3 className="mt-1.5 text-lg font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-[240px] text-[14px] leading-relaxed text-muted">{body}</p>
    </div>
  )
}

/** Decorative street map so the section works offline, without tile loading. */
function MapArt() {
  return (
    <div className="absolute inset-0">
      <svg className="h-full w-full" viewBox="0 0 400 260" fill="none" aria-hidden="true">
        <rect width="400" height="260" fill="#F1F5FC" />
        <path d="M0 90h400M0 180h400M110 0v260M255 0v260" stroke="#DCE7F7" strokeWidth="9" />
        <path d="M0 40h400M0 130h400M0 225h400M55 0v260M180 0v260M320 0v260" stroke="#EAF1FB" strokeWidth="5" />
        <rect x="130" y="100" width="70" height="60" rx="8" fill="#E1F3EC" />
        <rect x="280" y="30" width="80" height="50" rx="8" fill="#DBEAFE" />
        <circle cx="160" cy="130" r="6" fill="#10A37F" />
        <circle cx="320" cy="55" r="6" fill="#3B82F6" />
      </svg>
      <span className="absolute left-[38%] top-[52%] flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-card">
        <MapPin size={13} className="text-brand-500" /> Apollo
      </span>
      <span className="absolute left-[68%] top-[26%] flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-card">
        <MapPin size={13} className="text-ok" /> Clinic
      </span>
    </div>
  )
}
