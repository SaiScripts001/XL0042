import { useRef, useState } from 'react'
import {
  BadgeCheck,
  Database,
  Download,
  FileJson,
  Link2,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { useStore } from '../store.jsx'
import { toFhirBundle, fromFhirBundle } from '../lib/fhir.js'
import { downloadJson } from '../lib/format.js'
import { ErrorNote, PageHeader } from '../components/ui.jsx'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function Profile() {
  const { t, profile, patchProfile, records, linkAbha, unlinkAbha, importRecords, clearAll, showToast } = useStore()
  const [importOpen, setImportOpen] = useState(false)
  const [bundleText, setBundleText] = useState('')
  const [importError, setImportError] = useState('')
  const fileRef = useRef(null)

  const exportBundle = () => {
    downloadJson('ayu-health-fhir-bundle.json', toFhirBundle(profile, records))
    showToast(t('profile.export'))
  }

  const doImport = (text) => {
    try {
      const parsed = JSON.parse(text)
      const result = fromFhirBundle(parsed)
      importRecords(result.records, result.profile)
      setBundleText('')
      setImportOpen(false)
      setImportError('')
      showToast(t('profile.imported', { n: result.records.length }))
    } catch {
      setImportError(t('profile.importError'))
    }
  }

  const onFile = async (file) => {
    if (!file) return
    doImport(await file.text())
  }

  const erase = () => {
    if (!window.confirm(t('profile.clearConfirm'))) return
    clearAll()
    showToast(t('profile.clearAll'))
  }

  return (
    <div className="section py-12">
      <PageHeader
        eyebrow={
          <>
            <UserRound size={14} /> {t('nav.profile')}
          </>
        }
        title={t('profile.title')}
        sub={t('profile.sub')}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Personal details */}
          <section className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">{t('profile.personal')}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">{t('profile.name')}</label>
                <input
                  className="input"
                  value={profile.name}
                  onChange={(e) => patchProfile({ name: e.target.value })}
                  placeholder={t('profile.namePh')}
                />
              </div>
              <div>
                <label className="label">{t('profile.age')}</label>
                <input
                  className="input"
                  inputMode="numeric"
                  value={profile.age}
                  onChange={(e) => patchProfile({ age: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                  placeholder="42"
                />
              </div>
              <div>
                <label className="label">{t('profile.gender')}</label>
                <select
                  className="input"
                  value={profile.gender}
                  onChange={(e) => patchProfile({ gender: e.target.value })}
                >
                  <option value="">—</option>
                  <option value="Male">{t('profile.gender.male')}</option>
                  <option value="Female">{t('profile.gender.female')}</option>
                  <option value="Other">{t('profile.gender.other')}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('profile.blood')}</label>
                <select
                  className="input"
                  value={profile.bloodGroup}
                  onChange={(e) => patchProfile({ bloodGroup: e.target.value })}
                >
                  <option value="">—</option>
                  {BLOOD_GROUPS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Conditions & allergies */}
          <section className="card p-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <TagEditor
                label={t('profile.conditions')}
                tags={profile.conditions}
                onChange={(conditions) => patchProfile({ conditions })}
              />
              <TagEditor
                label={t('profile.allergies')}
                tags={profile.allergies}
                onChange={(allergies) => patchProfile({ allergies })}
              />
            </div>
          </section>

          {/* Data */}
          <section className="card p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink">
              <Database size={15} className="text-brand-500" />
              {t('profile.data')}
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-line p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Download size={15} className="text-brand-500" /> {t('profile.export')}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{t('profile.exportSub')}</p>
                <button type="button" onClick={exportBundle} disabled={records.length === 0} className="btn-soft btn-sm mt-3">
                  <FileJson size={14} /> {t('profile.export')}
                </button>
              </div>

              <div className="rounded-2xl border border-line p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Upload size={15} className="text-brand-500" /> {t('profile.import')}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{t('profile.importSub')}</p>
                <button type="button" onClick={() => setImportOpen((v) => !v)} className="btn-soft btn-sm mt-3">
                  <Upload size={14} /> {t('profile.importBtn')}
                </button>
              </div>
            </div>

            {importOpen && (
              <div className="mt-4 rounded-2xl border border-line bg-canvas p-4">
                {importError && (
                  <div className="mb-3">
                    <ErrorNote>{importError}</ErrorNote>
                  </div>
                )}
                <textarea
                  className="input min-h-32 font-mono text-xs"
                  placeholder='{"resourceType":"Bundle", ... }'
                  value={bundleText}
                  onChange={(e) => setBundleText(e.target.value)}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => doImport(bundleText)}
                    disabled={!bundleText.trim()}
                    className="btn-primary btn-sm"
                  >
                    {t('profile.importBtn')}
                  </button>
                  <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost btn-sm">
                    <FileJson size={14} /> {t('scan.browse')}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => onFile(e.target.files?.[0])}
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={erase}
              className="mt-5 flex items-center gap-2 text-sm font-medium text-crit/80 hover:text-crit"
            >
              <Trash2 size={15} /> {t('profile.clearAll')}
            </button>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          {/* ABHA mock */}
          <section className="card overflow-hidden">
            <div className="bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-white">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-90">
                <ShieldCheck size={14} /> {t('profile.abha')}
              </p>
              {profile.abha ? (
                <>
                  <p className="mt-3 font-mono text-xl font-bold tracking-wider">{profile.abha.number}</p>
                  <p className="mt-1 text-sm opacity-90">{profile.abha.address}</p>
                  <span className="chip mt-3 bg-white/20 text-white">
                    <BadgeCheck size={13} /> {t('profile.linked')}
                  </span>
                </>
              ) : (
                <p className="mt-3 text-sm opacity-90">{t('profile.noAbha')}</p>
              )}
            </div>
            <div className="p-5">
              <p className="text-[13px] leading-relaxed text-muted">{t('profile.abhaSub')}</p>
              {profile.abha ? (
                <button type="button" onClick={unlinkAbha} className="btn-ghost btn-sm mt-4 w-full">
                  <X size={15} /> {t('profile.unlink')}
                </button>
              ) : (
                <button type="button" onClick={linkAbha} className="btn-primary mt-4 w-full">
                  <Link2 size={15} /> {t('profile.linkAbha')}
                </button>
              )}
            </div>
          </section>

          <div className="card flex items-start gap-3 p-5">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-ok" />
            <p className="text-[13px] leading-relaxed text-muted">{t('profile.privacy')}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function TagEditor({ label, tags = [], onChange }) {
  const { t } = useStore()
  const [draft, setDraft] = useState('')

  const add = () => {
    const value = draft.trim()
    if (!value || tags.some((x) => x.toLowerCase() === value.toLowerCase())) return
    onChange([...tags, value])
    setDraft('')
  }

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="chip bg-canvas text-ink">
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((x) => x !== tag))}
              className="ml-1 text-muted hover:text-crit"
              aria-label={t('common.remove')}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-sm text-muted">—</span>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
        className="mt-3 flex gap-2"
      >
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('profile.addTag')}
        />
        <button type="submit" className="btn-soft shrink-0 px-3">
          <Plus size={16} />
        </button>
      </form>
    </div>
  )
}
