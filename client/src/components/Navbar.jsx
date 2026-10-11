import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Globe, Menu, Upload, X } from 'lucide-react'
import Logo from './Logo.jsx'
import { useStore } from '../store.jsx'

const LINKS = [
  { to: '/scan', key: 'nav.scan' },
  { to: '/timeline', key: 'nav.timeline' },
  { to: '/chat', key: 'nav.assistant' },
  { to: '/hospitals', key: 'nav.hospitals' },
  { to: '/profile', key: 'nav.profile' },
]

export default function Navbar() {
  const { t, lang, setLang, langs } = useStore()
  const [open, setOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const langRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
    setLangOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!langOpen) return undefined
    const onDown = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [langOpen])

  const active = langs.find((l) => l.code === lang) || langs[0]

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-shadow ${
        scrolled ? 'border-b border-line shadow-[0_1px_12px_rgba(51,47,60,.06)]' : 'border-b border-transparent'
      }`}
    >
      <div className="section flex h-[70px] items-center justify-between gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <Logo />
          <span className="text-[22px] font-bold leading-none">
            <span className="text-ink">Ayu</span>
            <span className="text-brand-500">Copilot</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-full px-3.5 py-2 text-[15px] font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:text-brand-600'
                }`
              }
            >
              {t(link.key)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Language */}
          <div className="relative" ref={langRef}>
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
            >
              <Globe size={16} />
              <span className="hidden sm:inline">{active.native}</span>
              <ChevronDown size={15} className={langOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
            {langOpen && (
              <ul
                role="listbox"
                className="absolute right-0 top-[calc(100%+8px)] w-52 overflow-hidden rounded-2xl border border-line bg-white py-1.5 shadow-pop"
              >
                {langs.map((l) => (
                  <li key={l.code}>
                    <button
                      type="button"
                      onClick={() => {
                        setLang(l.code)
                        setLangOpen(false)
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-brand-50 ${
                        l.code === lang ? 'font-semibold text-brand-700' : 'text-ink-soft'
                      }`}
                    >
                      <span>{l.native}</span>
                      <span className="text-xs text-muted">{l.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link to="/scan" className="btn-primary btn-sm hidden sm:inline-flex">
            <Upload size={16} />
            {t('nav.cta')}
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink lg:hidden"
            aria-label={t('nav.menu')}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="section flex flex-col gap-1 border-t border-line pb-4 pt-3 lg:hidden">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2.5 text-[15px] font-medium ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-soft'
                }`
              }
            >
              {t(link.key)}
            </NavLink>
          ))}
          <Link to="/scan" className="btn-primary mt-2 w-full">
            <Upload size={16} />
            {t('nav.cta')}
          </Link>
        </nav>
      )}
    </header>
  )
}
