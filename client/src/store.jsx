import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { loadState, saveState, DEFAULT_PROFILE, uid } from './lib/storage.js'
import { translate, STRINGS, LANGS } from './lib/i18n.js'
import { SAMPLE_RECORDS, SAMPLE_PROFILE } from './lib/sample.js'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => loadState())
  const [toast, setToast] = useState(null)

  useEffect(() => saveState(state), [state])

  // Keep the document language in sync for search engines / font selection
  useEffect(() => {
    document.documentElement.lang = state.lang
  }, [state.lang])

  const t = useCallback(
    (key, vars) => translate(state.lang, key, vars),
    [state.lang],
  )

  const showToast = useCallback((message, tone = 'ok') => {
    setToast({ message, tone, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  const value = useMemo(() => {
    const patchProfile = (patch) =>
      setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }))

    return {
      lang: state.lang,
      setLang: (lang) => setState((s) => ({ ...s, lang })),

      profile: state.profile,
      patchProfile,

      records: state.records,
      addRecord: (record) => {
        const rec = { id: uid(), createdAt: new Date().toISOString(), summary: '', summaryLang: '', ...record }
        setState((s) => ({ ...s, records: [rec, ...s.records] }))
        return rec
      },
      updateRecord: (id, patch) =>
        setState((s) => ({
          ...s,
          records: s.records.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteRecord: (id) => setState((s) => ({ ...s, records: s.records.filter((r) => r.id !== id) })),

      linkAbha: () =>
        setState((s) => {
          const number = randomAbha()
          const base = (s.profile.name || 'user').toLowerCase().replace(/[^a-z]/g, '').slice(0, 12) || 'user'
          return {
            ...s,
            profile: { ...s.profile, abha: { number, address: `${base}${Math.floor(Math.random() * 90 + 10)}@abdm` } },
          }
        }),
      unlinkAbha: () => setState((s) => ({ ...s, profile: { ...s.profile, abha: null } })),

      importRecords: (records, profile) =>
        setState((s) => ({
          ...s,
          profile: profile ? { ...s.profile, ...profile } : s.profile,
          records: [...records, ...s.records],
        })),

      loadSample: () =>
        setState((s) => ({
          ...s,
          profile: { ...DEFAULT_PROFILE, ...s.profile, ...SAMPLE_PROFILE },
          records: [...SAMPLE_RECORDS, ...s.records.filter((r) => r.source !== 'sample')],
        })),

      /* ── Assistant conversation history ── */
      chats: state.chats || [],
      /** Persist (or update) one conversation. Keeps only the 25 newest. */
      saveChat: (chat) =>
        setState((s) => {
          const withoutFile = (m) => ({ role: m.role, content: m.content, offline: m.offline })
          const entry = {
            id: chat.id,
            title: chat.title || 'New conversation',
            updatedAt: chat.updatedAt || new Date().toISOString(),
            messages: (chat.messages || []).slice(-40).map(withoutFile),
          }
          const rest = (s.chats || []).filter((c) => c.id !== chat.id)
          return { ...s, chats: [entry, ...rest].slice(0, 25) }
        }),
      deleteChat: (id) => setState((s) => ({ ...s, chats: (s.chats || []).filter((c) => c.id !== id) })),
      clearChats: () => setState((s) => ({ ...s, chats: [] })),

      clearAll: () =>
        setState((s) => ({ ...s, profile: { ...DEFAULT_PROFILE }, records: [] })),

      t,
      langs: LANGS,
      hasStrings: Object.keys(STRINGS[state.lang] || {}),
      toast,
      showToast,
    }
  }, [state, t, toast, showToast])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

/** XX-XXXX-XXXX-XXXX — the visual format of a real ABHA number (simulated here). */
function randomAbha() {
  const digits = () => Math.floor(1000 + Math.random() * 9000)
  const last = () => Math.floor(1000 + Math.random() * 9000)
  return `${digits()}-${digits()}-${digits()}-${last()}`
}
