/**
 * Deterministic, rule-based explainer for a single lab/vital reading.
 * No AI involved — it only restates the value against the printed reference
 * range, so every explanation is traceable to the document itself.
 * The AI summary adds the medical context on top of this.
 */

export function explainReading(item, t) {
  const label = item.test || item.name || ''
  const value = [item.value, item.unit].filter(Boolean).join(' ')
  const range = item.referenceRange || ''
  const flag = item.flag || 'unknown'

  switch (flag) {
    case 'high':
      return t('explain.high', {
        test: label,
        value,
        range: range || t('explain.noRange'),
      })
    case 'low':
      return t('explain.low', {
        test: label,
        value,
        range: range || t('explain.noRange'),
      })
    case 'critical':
      return t('explain.critical', {
        test: label,
        value,
        range: range || t('explain.noRange'),
      })
    case 'normal':
      return t('explain.normal', {
        test: label,
        value,
        range: range || t('explain.noRange'),
      })
    default:
      return t('explain.unknown', { test: label, value });
  }
}

/** Completeness checklist for an extraction — what the AI found vs what's missing. */
export function completeness(record, t) {
  return [
    { label: t('record.date'), ok: Boolean(record.date) },
    { label: t('record.doctor'), ok: Boolean(record.provider?.doctor || record.provider?.facility) },
    { label: t('scan.medicines'), ok: (record.medicines || []).length > 0, count: (record.medicines || []).length },
    { label: t('scan.labs'), ok: (record.labs || []).length > 0, count: (record.labs || []).length },
    { label: t('scan.vitals'), ok: (record.vitals || []).length > 0, count: (record.vitals || []).length },
    { label: t('scan.diagnoses'), ok: (record.diagnoses || []).length > 0, count: (record.diagnoses || []).length },
  ]
}

export function uncertainItems(record) {
  const out = []
  for (const m of record.medicines || []) if (m.uncertain && m.name) out.push(`💊 ${m.name}`)
  for (const l of record.labs || []) if (l.uncertain && l.test) out.push(`🧪 ${l.test}`)
  for (const v of record.vitals || []) if (v.uncertain && v.name) out.push(`❤️ ${v.name}`)
  return out
}
