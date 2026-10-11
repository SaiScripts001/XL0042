import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import L from 'leaflet'
import {
  ChevronDown,
  Clock,
  Crosshair,
  Globe,
  Hospital,
  Info,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Star,
  Stethoscope,
  Syringe,
} from 'lucide-react'
import { useStore } from '../store.jsx'
import { api } from '../lib/api.js'
import { SPECIALTIES, specialtyKey } from '../lib/specialty.js'
import { ErrorNote, PageHeader } from '../components/ui.jsx'

const FALLBACK_CENTER = { lat: 17.385, lng: 78.4867 } // Hyderabad

const CATEGORIES = [
  { value: 'hospital', key: 'hospitals.c.hospital', amenity: ['hospital'], Icon: Hospital },
  { value: 'clinic', key: 'hospitals.c.clinic', amenity: ['clinic', 'doctors'], Icon: Stethoscope },
  { value: 'pharmacy', key: 'hospitals.c.pharmacy', amenity: ['pharmacy'], Icon: Syringe },
]

export default function Hospitals() {
  const { t } = useStore()
  const [searchParams] = useSearchParams()
  const specialty = useMemo(() => {
    const s = (searchParams.get('specialty') || '').toLowerCase()
    return SPECIALTIES.includes(s) ? s : ''
  }, [searchParams])

  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const watchRef = useRef(null)

  const [center, setCenter] = useState(FALLBACK_CENTER)
  const [accuracy, setAccuracy] = useState(0)
  const [usingGeo, setUsingGeo] = useState(false)
  const [watching, setWatching] = useState(false)
  const [locating, setLocating] = useState(true)
  const [approxPlace, setApproxPlace] = useState('')
  const [hasGoogle, setHasGoogle] = useState(false)
  const [category, setCategory] = useState('hospital')
  const [radius, setRadius] = useState(5000)
  const [places, setPlaces] = useState([])
  const [source, setSource] = useState('osm')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [showReviews, setShowReviews] = useState(false)

  /* ── Map lifecycle ── */
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return undefined
    const map = L.map(mapEl.current).setView([FALLBACK_CENTER.lat, FALLBACK_CENTER.lng], 13)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (mapRef.current && mapRef.current.getContainer()?.isConnected) {
      mapRef.current.setView([center.lat, center.lng], usingGeo ? 15 : 14, { animate: false })
    }
  }, [center, usingGeo])

  /* ── Capability check (Google ratings available?) ── */
  useEffect(() => {
    api.health().then((h) => setHasGoogle(Boolean(h.hasGoogle))).catch(() => {})
  }, [])

  /* ── Live location: auto-locate on open ── */
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false)
      return undefined
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setAccuracy(pos.coords.accuracy || 0)
        setUsingGeo(true)
        setApproxPlace('')
        setLocating(false)
      },
      () => {
        setUsingGeo(false)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [])

  const toggleWatch = () => {
    if (watching) {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
      setWatching(false)
      return
    }
    if (!navigator.geolocation) return
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setAccuracy(pos.coords.accuracy || 0)
        setUsingGeo(true)
      },
      () => {},
      { enableHighAccuracy: true },
    )
    setWatching(true)
  }

  /* Ask the browser first (accurate), then fall back to a city-level IP lookup
   so "Use my current location" still works when permission is denied. */
  const locate = useCallback(() => {
    setError('')
    setLocating(true)

    const useApprox = (label) => {
      fetch('/api/geolocate')
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.place) {
            setCenter({ lat: data.place.lat, lng: data.place.lng })
            setAccuracy(0)
            setUsingGeo(false)
            setApproxPlace(label || data.place.label || '')
          } else {
            setUsingGeo(false)
            setError(t('hospitals.geoDenied'))
          }
        })
        .catch(() => {
          setUsingGeo(false)
          setError(t('hospitals.geoDenied'))
        })
        .finally(() => setLocating(false))
    }

    if (!navigator.geolocation) {
      useApprox('')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setAccuracy(pos.coords.accuracy || 0)
        setUsingGeo(true)
        setApproxPlace('')
        setLocating(false)
      },
      (err) => {
        // denied / unavailable / timeout → IP-based city estimate
        useApprox(err?.code === 1 ? t('hospitals.geoApprox') : '')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [t])

  /* ── Search: Google (ratings+reviews) when configured, else OpenStreetMap ── */
  const activeCat = useMemo(() => CATEGORIES.find((c) => c.value === category), [category])
  const seqRef = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    let alive = true
    const seq = ++seqRef.current
    const current = () => alive && seq === seqRef.current

    ;(async () => {
      setLoading(true)
      setError('')
      try {
        if (hasGoogle) {
          const data = await api.placesGoogle(center.lat, center.lng, radius, category, specialty)
          if (!current()) return
          setSource('google')
          setPlaces(data.places || [])
        } else {
          const res = await fetch('/api/places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: center.lat, lng: center.lng, radius, amenity: activeCat.amenity }),
            signal: controller.signal,
          })
          const data = await res.json().catch(() => ({}))
          if (!current()) return
          if (!res.ok || data.ok === false) {
            setPlaces([])
            setError(data.error || t('hospitals.error'))
          } else {
            setSource('osm')
            setPlaces((data.places || []).map((p) => ({ ...p, name: p.name || t(activeCat.key) })))
          }
        }
      } catch (err) {
        if (!current() || controller.signal.aborted || err.name === 'AbortError') return
        // Google failed (quota/key) → fall back to OSM so the map never goes blank
        if (hasGoogle) {
          try {
            const res = await fetch('/api/places', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lat: center.lat, lng: center.lng, radius, amenity: activeCat.amenity }),
            })
            const data = await res.json().catch(() => ({}))
            if (!current()) return
            if (data.ok) {
              setSource('osm-fallback')
              setPlaces((data.places || []).map((p) => ({ ...p, name: p.name || t(activeCat.key) })))
              return
            }
          } catch {
            if (!current()) return
          }
        }
        setPlaces([])
        setError(t('hospitals.error'))
      } finally {
        if (current()) setLoading(false)
      }
    })()

    return () => {
      alive = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, radius, activeCat, t, hasGoogle, specialty])

  /* ── Markers (you + places + accuracy circle) ── */
  useEffect(() => {
    if (!layerRef.current) return
    layerRef.current.clearLayers()

    const pin = (rated) =>
      L.divIcon({
        className: '',
        html: `<div class="hospital-pin"><span>${rated ? '★' : '✚'}</span></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -30],
      })
    const you = L.divIcon({
      className: '',
      html: '<div class="hospital-pin you"><span>●</span></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    })

    if (usingGeo && accuracy > 0) {
      L.circle([center.lat, center.lng], {
        radius: Math.min(accuracy, 2000),
        color: '#3b82f6',
        weight: 1,
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(layerRef.current)
    }
    L.marker([center.lat, center.lng], { icon: you, interactive: false }).addTo(layerRef.current)

    for (const p of places) {
      const dist = p.distance < 1000 ? `${Math.round(p.distance)} m` : `${(p.distance / 1000).toFixed(1)} km`
      const rating = p.rating ? ` · ★ ${p.rating.toFixed(1)} (${p.reviewCount})` : ''
      const m = L.marker([p.lat, p.lng], { icon: pin(Boolean(p.rating)) })
        .addTo(layerRef.current)
        .bindPopup(`<strong>${escapeHtml(p.name)}</strong><br/>${dist} ${t('hospitals.distance')}${rating}`)
      m.on('click', () => {
        setSelected(p)
        setShowReviews(false)
      })
    }
  }, [places, center, accuracy, usingGeo, t])

  useEffect(() => {
    if (selected && mapRef.current && mapRef.current.getContainer()?.isConnected) {
      mapRef.current.setView([selected.lat, selected.lng], 15, { animate: false })
    }
  }, [selected])

  const searchPlace = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      const data = await res.json().catch(() => ({}))
      if (data.ok && data.place) {
        setCenter({ lat: data.place.lat, lng: data.place.lng })
        setAccuracy(0)
        setUsingGeo(false)
      } else {
        setError(t('hospitals.empty'))
      }
    } catch {
      setError(t('hospitals.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="section py-12">
      <PageHeader
        eyebrow={
          <>
            <MapPin size={14} /> {t('nav.hospitals')}
          </>
        }
        title={t('hospitals.title')}
        sub={t('hospitals.sub')}
        actions={
          <>
            <button
              type="button"
              onClick={toggleWatch}
              className={watching ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
              title={t('hospitals.live')}
            >
              <span className={`h-2 w-2 rounded-full ${watching ? 'animate-pulse bg-white' : 'bg-crit'}`} />
              {t('hospitals.live')}
            </button>
            <button type="button" onClick={locate} className="btn-primary btn-sm" disabled={locating}>
              <Crosshair size={15} /> {locating ? t('hospitals.locating') : t('hospitals.useLocation')}
            </button>
          </>
        }
      />

      {specialty && (
        <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <Stethoscope size={17} className="mt-0.5 shrink-0" />
          <div>
            <strong>{t('hospitals.forSpecialty', { specialty: t(specialtyKey(specialty)) })}</strong>
            <p className="mt-0.5 text-[13px] opacity-90">{t('hospitals.ratingNote')}</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="card mb-5 flex flex-wrap items-center gap-3 p-4">
        <form onSubmit={searchPlace} className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-10"
            placeholder={t('hospitals.searchCity')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ value, key, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                category === value
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-line text-ink-soft hover:border-brand-300'
              }`}
            >
              <Icon size={14} /> {t(key)}
            </button>
          ))}
        </div>

        <select
          className="input w-auto"
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          aria-label={t('hospitals.radius')}
        >
          <option value={2000}>2 km</option>
          <option value={5000}>5 km</option>
          <option value={10000}>10 km</option>
          <option value={20000}>20 km</option>
        </select>

        <button
          type="button"
          onClick={() => setCenter({ ...center })}
          className="btn-ghost btn-sm"
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {t('common.retry')}
        </button>
      </div>

      {error && (
        <div className="mb-5">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        {/* Map */}
        <div className="card relative overflow-hidden p-0">
          <div ref={mapEl} className="h-[540px] w-full" />
          {(loading || locating) && (
            <div className="absolute inset-0 z-[500] grid place-items-center bg-white/60 backdrop-blur-sm">
              <span className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium shadow-card">
                <Loader2 size={16} className="animate-spin text-brand-500" />
                {locating && places.length === 0 ? t('hospitals.locating') : t('hospitals.loadingPlaces')}
              </span>
            </div>
          )}
          {usingGeo && !loading && (
            <span className="absolute left-4 top-4 z-[500] flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white shadow-card">
              <span className="h-2 w-2 animate-pulse rounded-full bg-ok" />
              {t('hospitals.liveLocation')}
            </span>
          )}
          {!usingGeo && approxPlace && (
            <span className="absolute left-4 top-4 z-[500] flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white shadow-card">
              <Info size={12} className="opacity-80" />
              {t('hospitals.approxArea', { place: approxPlace })}
            </span>
          )}
        </div>

        {/* Results */}
        <div className="card flex h-[540px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink">
              <activeCat.Icon size={15} className="text-brand-500" />
              {t(activeCat.key)}
            </h3>
            <span className="flex items-center gap-2 text-xs text-muted">
              {loading ? t('common.loading') : t('hospitals.results', { n: places.length })}
              <SourceBadge source={source} />
            </span>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {places.length === 0 && !loading && (
              <p className="px-4 py-10 text-center text-sm text-muted">{t('hospitals.empty')}</p>
            )}
            {places.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl border transition-colors ${
                  selected?.id === p.id ? 'border-brand-400 bg-brand-50' : 'border-line'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelected(selected?.id === p.id ? null : p)
                    setShowReviews(false)
                  }}
                  className="w-full p-3.5 text-left"
                >
                  <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span>
                      {p.distance < 1000 ? `${Math.round(p.distance)} m` : `${(p.distance / 1000).toFixed(1)} km`}{' '}
                      {t('hospitals.distance')}
                    </span>
                    {p.rating && <Stars rating={p.rating} count={p.reviewCount} />}
                    {p.openNow === true && <span className="font-semibold text-ok">· {t('hospitals.openNow')}</span>}
                    {p.openNow === false && <span className="font-semibold text-crit">· {t('hospitals.closed')}</span>}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <a
                      className="chip bg-brand-50 text-brand-700 hover:bg-brand-100"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Navigation size={12} /> {t('hospitals.directions')}
                    </a>
                    {p.phone && (
                      <a
                        className="chip bg-canvas text-ink-soft hover:bg-line"
                        href={`tel:${p.phone}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.phone}
                      </a>
                    )}
                    {p.website && (
                      <a
                        className="chip bg-canvas text-ink-soft hover:bg-line"
                        href={p.website}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe size={12} /> {t('hospitals.web')}
                      </a>
                    )}
                  </div>
                </button>

                {selected?.id === p.id && p.reviews?.length > 0 && (
                  <div className="border-t border-line px-3.5 py-3">
                    <button
                      type="button"
                      onClick={() => setShowReviews((v) => !v)}
                      className="flex w-full items-center justify-between text-[13px] font-semibold text-ink"
                    >
                      {t('hospitals.reviews', { n: p.reviewCount || p.reviews.length })}
                      <ChevronDown size={15} className={showReviews ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    </button>
                    {showReviews && (
                      <ul className="mt-2.5 space-y-2.5">
                        {p.reviews.map((rv, i) => (
                          <li key={i} className="rounded-xl bg-white p-3 text-[13px]">
                            <p className="flex items-center justify-between gap-2">
                              <span className="truncate font-semibold text-ink">{rv.author}</span>
                              <MiniStars rating={rv.rating} />
                            </p>
                            {rv.time && <p className="text-[11px] text-muted">{rv.time}</p>}
                            <p className="mt-1 leading-relaxed text-ink-soft">{rv.text}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="flex items-start gap-1.5 border-t border-line px-5 py-3 text-[11px] leading-relaxed text-muted">
            <Info size={12} className="mt-0.5 shrink-0" />
            {source === 'google'
              ? t('hospitals.googleNote')
              : `${usingGeo ? t('hospitals.you') : t('hospitals.useLocation')} · © OpenStreetMap contributors`}
          </p>
        </div>
      </div>
    </div>
  )
}

function SourceBadge({ source }) {
  if (source === 'google')
    return (
      <span className="chip bg-ok/10 text-ok">
        <Star size={11} /> Google
      </span>
    )
  return (
    <span className="chip bg-canvas text-muted">
      <MapPin size={11} /> OSM
    </span>
  )
}

function Stars({ rating, count }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-ink">
      <Star size={13} className="fill-amber-400 text-amber-400" />
      {rating.toFixed(1)}
      {count > 0 && <span className="font-normal text-muted">({count})</span>}
    </span>
  )
}

function MiniStars({ rating }) {
  const full = Math.round(Number(rating) || 0)
  return (
    <span className="inline-flex gap-px">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={11} className={s <= full ? 'fill-amber-400 text-amber-400' : 'text-line'} />
      ))}
    </span>
  )
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
