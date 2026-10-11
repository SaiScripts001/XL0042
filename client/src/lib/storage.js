/**
 * Central client store — profile, records, language.
 * Everything lives in localStorage: nothing about your health leaves the device
 * except the document images you explicitly send to the AI for reading.
 */

const KEY = 'ayu-health-copilot-v1'

export const DEFAULT_PROFILE = {
  name: '',
  age: '',
  gender: '',
  bloodGroup: '',
  conditions: [],
  allergies: [],
  abha: null, // { number, address, linkedAt }
}

export const DEFAULT_STATE = {
  lang: 'en',
  profile: DEFAULT_PROFILE,
  records: [],
  chats: [], // saved assistant conversations (most recent first)
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_STATE,
      ...parsed,
      profile: { ...DEFAULT_PROFILE, ...(parsed.profile || {}) },
      records: Array.isArray(parsed.records) ? parsed.records : [],
      chats: Array.isArray(parsed.chats) ? parsed.chats : [],
    }
  } catch {
    return DEFAULT_STATE
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (err) {
    // Most likely: storage quota exceeded (large document previews).
    console.warn('Could not persist state', err)
  }
}

export const uid = () =>
  `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
