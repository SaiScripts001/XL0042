/**
 * Deterministic, records-grounded fallback used ONLY when every
 * Groq key is rate-limited (free tier daily quota). It answers from
 * the patient's own saved records with template text — the demo
 * keeps working while the AI quota resets. Clearly labelled as
 * "offline mode" so it is never mistaken for AI output.
 */

const LANG_OFFLINE = {
  en: {
    mode: 'offline',
    intro:
      'I am in offline mode right now (the AI daily limit was reached), so I am answering from your saved records without AI. The full AI assistant returns in a few minutes.',
    meds: (names) => `💊 Medicines in your records: ${names.join(', ')}.`,
    labs: (lines) => `🧪 Tests in your records:\n${lines.map((l) => `- ${l}`).join('\n')}`,
    flagged: (lines) =>
      `⚠️ Values outside the printed reference range:\n${lines.map((l) => `- ${l}`).join('\n')}\nThese are worth discussing with your doctor at your next visit.`,
    profile: (p) =>
      [
        p.name ? `👤 ${p.name}` : '',
        p.age ? `Age ${p.age}` : '',
        p.bloodGroup ? `Blood group ${p.bloodGroup}` : '',
        p.conditions?.length ? `Conditions: ${p.conditions.join(', ')}` : '',
        p.allergies?.length ? `Allergies: ${p.allergies.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
    noData:
      'I do not have any saved records to answer from yet. Upload a prescription or lab report on the Scan page, then ask me again.',
    retry:
      'Please retry in a few minutes for the full AI answer — or ask about your medicines, tests or flagged values and I will read them from your records.',
    emergency:
      'This sounds urgent. If you are experiencing chest pain, severe bleeding, unconsciousness or trouble breathing, call 108 (India emergency) or go to the nearest emergency room now. /hospitals',
  },
  hi: {
    mode: 'offline',
    intro:
      'अभी मैं ऑफ़लाइन मोड में हूँ (AI की दैनिक सीमा पूरी हो गई), इसलिए आपके सहेजे गए रिकॉर्ड से बिना AI के जवाब दे रहा हूँ। पूरा AI असिस्टेंट कुछ मिनट में लौटेगा।',
    meds: (names) => `💊 आपके रिकॉर्ड में दवाएँ: ${names.join(', ')}।`,
    labs: (lines) => `🧪 आपके रिकॉर्ड में जाँच:\n${lines.map((l) => `- ${l}`).join('\n')}`,
    flagged: (lines) =>
      `⚠️ छपी सीमा से बाहर मान:\n${lines.map((l) => `- ${l}`).join('\n')}\nइन्हें अगली बार डॉक्टर से चर्चा करें।`,
    profile: (p) =>
      [
        p.name ? `👤 ${p.name}` : '',
        p.age ? `आयु ${p.age}` : '',
        p.bloodGroup ? `ब्लड ग्रुप ${p.bloodGroup}` : '',
        p.conditions?.length ? `बीमारियाँ: ${p.conditions.join(', ')}` : '',
        p.allergies?.length ? `एलर्जी: ${p.allergies.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
    noData:
      'जवाब देने के लिए मेरे पास अभी कोई सहेजा रिकॉर्ड नहीं है। Scan पेज पर प्रिस्क्रिप्शन या लैब रिपोर्ट अपलोड करें, फिर पूछें।',
    retry:
      'पूरा AI जवाब कुछ मिनट में रीट्राई करें — या अपनी दवाओं, जाँच या असामान्य मानों के बारे में पूछें, मैं रिकॉर्ड से पढ़कर बताऊँगा।',
    emergency:
      'यह तात्कालिक लग रहा है। छाती में दर्द, अधिक रक्तस्राव, बेहोशी या साँस लेने में तकलीफ हो तो तुरंत 108 पर कॉल करें या निकटतम इमरजेंसी रूम जाएँ। /hospitals',
  },
}

function pick(language) {
  return LANG_OFFLINE[language] || LANG_OFFLINE.en
}

const RX = [
  {
    test: /(emergency|chest pain|severe bleeding|unconscious|breathless|snake bite|self.?harm)/i,
    use: 'emergency',
  },
  {
    test: /(medicine|medicines|medication|drug|dose|prescription|pill|tablet|दवा|మందు|மருந்து)/i,
    run: (r, L) => {
      const names = r.flatMap((x) => (x.medicines || []).map((m) => m.name)).filter(Boolean)
      return names.length ? L.meds([...new Set(names)]) : L.noData
    },
  },
  {
    test: /(test|lab|report|blood|sugar|hba1c|cholesterol|pressure|जाँच|పరీక్ష|தேவை|report)/i,
    run: (r, L) => {
      const lines = r.flatMap((x) =>
        (x.labs || []).map((l) => `${l.test}: ${l.value}${l.unit ? ` ${l.unit}` : ''} (range ${l.referenceRange || '—'}, ${l.flag})`),
      )
      return lines.length ? L.labs(lines) : L.noData
    },
  },
  {
    test: /(high|low|abnormal|flag|critical|concern|wrong|bad|danger)/i,
    run: (r, L) => {
      const lines = r.flatMap((x) =>
        (x.labs || [])
          .filter((l) => l.flag && l.flag !== 'normal' && l.flag !== 'unknown')
          .map((l) => `${l.test} ${l.value}${l.unit ? ` ${l.unit}` : ''} — ${l.flag} (range ${l.referenceRange || '—'})`),
      )
      return lines.length ? L.flagged(lines) : 'All values in your saved records are within their printed reference ranges. Nothing is flagged.'
    },
  },
  {
    test: /(profile|about me|my age|blood group|condition|allergy|history)/i,
    run: (_r, L, profile) => (profile?.name ? L.profile(profile) : L.noData),
  },
]

/** Best-effort deterministic reply grounded in the patient's records. */
export function fallbackReply(messages, profile = {}, records = [], language = 'en') {
  const L = pick(language)
  const last = [...messages].reverse().find((m) => m.role === 'user')
  const q = String(last?.content || '').toLowerCase()

  for (const rule of RX) {
    if (rule.test.test(q)) return `${L.intro}\n\n${rule.run(records, L, profile)}\n\n${L.retry}`
  }

  const meds = [...new Set(records.flatMap((r) => (r.medicines || []).map((m) => m.name)).filter(Boolean))]
  const labs = records.flatMap((r) =>
    (r.labs || []).map((l) => `${l.test}: ${l.value}${l.unit ? ` ${l.unit}` : ''} (${l.flag})`),
  )
  const parts = [`${L.intro}`]
  if (meds.length) parts.push(L.meds(meds))
  if (labs.length) parts.push(L.labs(labs))
  if (!meds.length && !labs.length) parts.push(L.noData)
  parts.push(L.retry)
  return parts.join('\n\n')
}

/** Template condition guide used only when AI quota is exhausted. */
export function fallbackGuide(diagnosis, record = {}, language = 'en') {
  const labs = (record.labs || [])
    .map((l) => `- ${l.test}: ${l.value}${l.unit ? ` ${l.unit}` : ''} (printed range ${l.referenceRange || '—'}, ${l.flag})`)
    .join('\n')
  const meds = (record.medicines || []).map((m) => `${m.name}${m.dosage ? ` ${m.dosage}` : ''}`).join(', ')

  const lines = [
    `**What this means** — "${diagnosis.name}" appears on your own medical document. This is patient education about the wording your doctor wrote — it is not a new diagnosis.`,
    '**Usual care pillars** — take only the medicines YOUR doctor prescribed, exactly as prescribed; keep follow-up appointments and repeat the tests your doctor ordered.',
    '**Red flags — seek care promptly** — new or worsening pain, high fever, confusion, trouble breathing, bleeding, or a rapid change in how you feel: contact your doctor or visit a hospital without delay.',
    '**Questions for your doctor** — What is my target for my next test? What symptoms should make me call sooner? How often should I follow up?',
  ]
  if (labs) lines.push(`**Your related values from this document**\n${labs}`)
  if (meds) lines.push(`**Medicines on this document** — ${meds} (take exactly as prescribed; do not change doses yourself).`)
  lines.push(
    '**Finding the right care** — for this condition, ask your doctor which specialist is right for you. You can find nearby hospitals and clinics on the Hospitals page: /hospitals',
    '\nAI-generated guide for understanding only — not medical advice. Please consult a qualified doctor for decisions about your health. In an emergency call 108.',
    `\n[offline template — the full AI guide returns when the daily quota resets]`,
  )
  return lines.join('\n\n')
}

/** Template summary used only when AI quota is exhausted. */
export function fallbackSummary(record = {}) {
  const parts = [`${record.title || 'Medical document'}${record.date ? ` dated ${record.date}` : ''}.`]
  if (record.provider?.doctor || record.provider?.facility) {
    parts.push(`From ${[record.provider?.doctor, record.provider?.facility].filter(Boolean).join(' — ')}.`)
  }
  const meds = (record.medicines || []).map((m) => `${m.name}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? `, ${m.frequency}` : ''}`)
  if (meds.length) parts.push(`Medicines: ${meds.join('; ')}.`)
  const flagged = (record.labs || []).filter((l) => l.flag && l.flag !== 'normal' && l.flag !== 'unknown')
  if (flagged.length) {
    parts.push(
      `Values outside the printed range: ${flagged.map((l) => `${l.test} ${l.value}${l.unit ? ` ${l.unit}` : ''} (${l.flag})`).join('; ')}. Discuss these with your doctor.`,
    )
  }
  const dx = (record.diagnoses || []).map((d) => d.name).filter(Boolean)
  if (dx.length) parts.push(`Written diagnosis: ${dx.join(', ')}.`)
  parts.push(
    'AI-generated summary for understanding only — not medical advice. Please consult a qualified doctor. [offline template — the full AI summary returns when the daily quota resets]',
  )
  return parts.join(' ')
}
