import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Voice input + read-aloud for the health assistant, using the browser's
 * Web Speech API (SpeechRecognition / speechSynthesis). No extra deps.
 *
 * Recognition is set to the app language so Hindi/Telugu/Tamil patients
 * can speak in their own language. Results stream as `interim` text and
 * `onFinal` fires on the completed phrase.
 *
 * Feature detection: Chrome/Edge/Safari support it; Firefox does not
 * expose SpeechRecognition yet, so the UI hides the mic when unsupported.
 */

// Language tags the recognizer understands well
const RECOGNITION_LANG = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
}

// Voices per language for read-aloud
const SPEECH_LANG = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
}

function getRecognition() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

/** True while the user wants to listen, even between Chrome's auto-restarts. */
const wantListeningRef = { current: false }

export function speechSupported() {
  return Boolean(getRecognition())
}

export function useSpeech(lang = 'en', { onFinal } = {}) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recRef = useRef(null)
  const finalRef = useRef('')
  // Keep the callback in a ref: callers usually pass an inline arrow, and
  // depending on it would tear down and rebuild the recognizer on every
  // render — which silently breaks recognition.
  const onFinalRef = useRef(onFinal)
  useEffect(() => {
    onFinalRef.current = onFinal
  }, [onFinal])

  useEffect(() => {
    setSupported(speechSupported())
  }, [])

  // (Re)create recognition when language changes
  useEffect(() => {
    const Rec = getRecognition()
    if (!Rec) return undefined

    const rec = new Rec()
    rec.lang = RECOGNITION_LANG[lang] || 'en-IN'
    // continuous + interim: Chrome ends a session after a short pause, so we
    // keep it alive with a restart instead of forcing the user to tap again
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) finalRef.current += transcript
        else interim += transcript
      }
      if (interim) setListening(true)
    }

    rec.onend = () => {
      const finalText = finalRef.current.trim()
      finalRef.current = ''
      if (finalText && onFinalRef.current) onFinalRef.current(finalText)
      // Chrome stops the session on its own after ~3s of silence. If the user
      // has not pressed stop yet, restart so the mic simply keeps listening.
      if (wantListeningRef.current) {
        try {
          rec.start()
          return
        } catch {
          /* ignore */
        }
      }
      setListening(false)
    }

    rec.onerror = (event) => {
      finalRef.current = ''
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // routine silence/timeout — let onend restart if still wanted
        return
      }
      setListening(false)
      wantListeningRef.current = false
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setSupported(false)
      }
    }

    recRef.current = rec
    return () => {
      wantListeningRef.current = false
      rec.onend = null
      rec.onresult = null
      rec.onerror = null
      try {
        rec.abort()
      } catch {
        /* already stopped */
      }
    }
  }, [lang])

  const start = useCallback(() => {
    const rec = recRef.current
    if (!rec) return
    finalRef.current = ''
    wantListeningRef.current = true
    try {
      rec.start()
      setListening(true)
    } catch {
      // already running — fine
    }
  }, [])

  const stop = useCallback(() => {
    const rec = recRef.current
    if (!rec) return
    wantListeningRef.current = false
    try {
      rec.stop()
    } catch {
      /* not running */
    }
    setListening(false)
  }, [])

  const toggle = useCallback(() => {
    if (wantListeningRef.current) stop()
    else start()
  }, [start, stop])

  return { listening: listening || wantListeningRef.current, supported, start, stop, toggle }
}

/** Read text aloud (read-aloud button). Returns controls to speak/stop. */
export function useSpeak(lang = 'en') {
  const [speaking, setSpeaking] = useState(false)
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  const speak = useCallback(
    (text) => {
      if (!supported || !text) return
      window.speechSynthesis.cancel()
      // strip markdown ** and bullet dashes for cleaner speech
      const clean = String(text)
        .replace(/\*\*/g, '')
        .replace(/^[-•]\s*/gm, '')
        .replace(/\n{2,}/g, '. ')
        .replace(/ⓘ[^\n]*/g, '')
        .trim()
      const utter = new SpeechSynthesisUtterance(clean)
      utter.lang = SPEECH_LANG[lang] || 'en-IN'
      utter.rate = 0.98
      utter.pitch = 1
      utter.onend = () => setSpeaking(false)
      utter.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(utter)
      setSpeaking(true)
    },
    [lang, supported],
  )

  useEffect(() => () => supported && window.speechSynthesis.cancel(), [supported])

  return { speaking, supported, speak, stop, toggle: () => (speaking ? stop() : speak) }
}