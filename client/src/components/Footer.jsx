import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useStore } from '../store.jsx'

export default function Footer() {
  const { t } = useStore()
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-line bg-canvas">
      <div className="section grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-lg font-bold">
              <span className="text-ink">Ayu</span>
              <span className="text-brand-500">Copilot</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{t('footer.tagline')}</p>
        </div>

        <FooterCol title={t('footer.product')}>
          <FooterLink to="/scan">{t('nav.scan')}</FooterLink>
          <FooterLink to="/timeline">{t('nav.timeline')}</FooterLink>
          <FooterLink to="/chat">{t('nav.assistant')}</FooterLink>
          <FooterLink to="/hospitals">{t('nav.hospitals')}</FooterLink>
        </FooterCol>

        <FooterCol title={t('footer.resources')}>
          <FooterLink to="/profile">{t('profile.abha')}</FooterLink>
          <FooterLink to="/profile">{t('profile.export')}</FooterLink>
          <FooterLink to="/">{t('landing.featTitle')}</FooterLink>
        </FooterCol>

        <FooterCol title={t('footer.legal')}>
          <span className="text-sm text-muted">{t('footer.privacy')}</span>
          <span className="text-sm text-muted">{t('footer.terms')}</span>
          <span className="text-sm text-muted">{t('footer.about')}</span>
        </FooterCol>
      </div>

      <div className="section border-t border-line py-6">
        <p className="text-xs leading-relaxed text-muted">{t('footer.disclaimer')}</p>
        <p className="mt-3 text-xs text-muted">
          © {year} Ayu Copilot. {t('footer.rights')}
        </p>
      </div>
    </footer>
  )
}

function FooterCol({ title, children }) {
  return (
    <div>
      <h4 className="text-sm font-semibold uppercase tracking-wide text-ink">{title}</h4>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </div>
  )
}

function FooterLink({ to, children }) {
  return (
    <Link to={to} className="text-sm text-ink-soft transition-colors hover:text-brand-600">
      {children}
    </Link>
  )
}
