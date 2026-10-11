/**
 * Condition → medical specialty map.
 * Used to point the patient at the right KIND of doctor / department —
 * informational only, never a claim about any specific hospital.
 */

/**
 * Specialty slugs only — never shown to the user. Labels come from the
 * i18n table (`specialty.<slug>`) so they translate with the UI.
 */
export const SPECIALTIES = [
  'cardiology',
  'endocrinology',
  'neurology',
  'orthopedics',
  'dermatology',
  'ophthalmology',
  'ent',
  'gastroenterology',
  'pulmonology',
  'nephrology',
  'gynecology',
  'pediatrics',
  'general',
]

/** i18n key for a specialty slug. */
export const specialtyKey = (slug) => `specialty.${slug}`

const RULES = [
  { specialty: 'cardiology', match: ['heart', 'cardiac', 'coronary', 'myocardial', 'angina', 'hypertension', 'blood pressure', 'arrhythm', 'valve', 'cholesterol', 'dyslipid', 'ecg', 'echo'] },
  { specialty: 'endocrinology', match: ['diabet', 'hba1c', 'glucose', 'sugar', 'thyroid', 'tsh', 't3', 't4', 'hormone', 'pcos', 'obes'] },
  { specialty: 'neurology', match: ['neuro', 'migraine', 'headache', 'seizure', 'epilep', 'stroke', 'parkinson', 'dementia', 'alzheimer', 'neuropathy', 'sciatica', 'vertigo'] },
  { specialty: 'orthopedics', match: ['fracture', 'arthritis', 'joint', 'knee', 'shoulder', 'back pain', 'spine', 'orthop', 'ligament', 'osteoporosis', 'spondyl'] },
  { specialty: 'dermatology', match: ['skin', 'dermat', 'eczema', 'psoriasis', 'acne', 'rash', 'fungal', 'alopecia', 'urticaria'] },
  { specialty: 'ophthalmology', match: ['eye', 'ophthal', 'cataract', 'glaucoma', 'vision', 'retina', 'myopia'] },
  { specialty: 'ent', match: ['ear', 'nose', 'throat', 'ent', 'tonsil', 'sinus', 'hearing', 'thyroid nodule'] },
  { specialty: 'gastroenterology', match: ['gastr', 'liver', 'hepat', 'ulcer', 'acidity', 'gerd', 'ibs', 'stomach', 'intestine', 'colon', 'piles', 'jaundice', 'fatty liver'] },
  { specialty: 'pulmonology', match: ['lung', 'pulmo', 'asthma', 'copd', 'tb', 'tuberculosis', 'pneumonia', 'breath', 'cough', 'bronch'] },
  { specialty: 'nephrology', match: ['kidney', 'nephro', 'renal', 'creatinine', 'dialysis', 'urinary', 'uti', 'bladder', 'prostate'] },
  { specialty: 'gynecology', match: ['pregnan', 'gynae', 'gynaec', 'pcos', 'fibroid', 'menstru', 'obstetric', 'antenatal'] },
  { specialty: 'pediatrics', match: ['child', 'pediatric', 'infant', 'newborn', 'vaccin'] },
]

/** Best-guess specialty for a diagnosis name, or 'general'. */
export function specialtyForDiagnosis(name = '') {
  const needle = String(name).toLowerCase()
  for (const rule of RULES) {
    if (rule.match.some((k) => needle.includes(k))) return rule.specialty
  }
  return 'general'
}

/** Best-guess specialty across all diagnoses in a record. */
export function specialtyForRecord(record) {
  const names = (record?.diagnoses || []).map((d) => d.name)
  for (const name of names) {
    const s = specialtyForDiagnosis(name)
    if (s !== 'general') return s
  }
  // Fall back to distinctive labs (e.g. HbA1c with no written diagnosis)
  const labs = ((record?.labs || []).map((l) => l.test) || []).join(' ').toLowerCase()
  if (/hba1c|glucose/.test(labs)) return 'endocrinology'
  if (/cholesterol|ldl|triglyceride/.test(labs)) return 'cardiology'
  if (/creatinine|egfr/.test(labs)) return 'nephrology'
  return 'general'
}
