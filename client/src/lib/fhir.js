/**
 * ABDM readiness — FHIR-style Bundle export / import.
 *
 * Maps our internal record shape to standard FHIR R4 resources:
 *   Patient · Observation (labs & vitals) · MedicationRequest · Condition · DocumentReference
 * so the data model can drop into the ABDM (Ayushman Bharat Digital Mission) ecosystem.
 */

const SYSTEM = 'http://ayu-copilot.local'

const CONDITION_TYPES = {
  lab_report: 'Laboratory',
  prescription: 'Medication',
  discharge_summary: 'Discharge-summary',
  diagnostic_report: 'Diagnostic-imaging',
  imaging_report: 'Diagnostic-imaging',
  other: 'Other',
}

const id = () => Math.random().toString(36).slice(2, 12)
const dt = (d) => (d ? `${d}T00:00:00+05:30` : new Date().toISOString())

export function toFhirBundle(profile, records) {
  const entries = []
  const push = (resource) =>
    entries.push({ fullUrl: `urn:uuid:${id()}`, resource, request: { method: 'POST', url: resource.resourceType } })

  // 1. Patient
  const patientId = id()
  push({
    resourceType: 'Patient',
    id: patientId,
    meta: { profile: ['https://ndhm.gov.in/fhir/R4/StructureDefinition/patient'] },
    extension: profile?.abha?.number
      ? [{ url: 'https://ndhm.gov.in/fhir/R4/StructureDefinition/abha-number', valueString: profile.abha.number }]
      : [],
    identifier: profile?.abha?.address
      ? [{ system: 'https://abdm.gov.in/abha-address', value: profile.abha.address }]
      : [],
    name: [{ text: profile?.name || 'Unknown' }],
    gender: { male: 'male', female: 'female' }[profile?.gender] || 'other',
    birthDate: profile?.age ? String(new Date().getFullYear() - Number(profile.age) || '') : undefined,
  })

  for (const rec of records) {
    const recId = rec.id || id()

    // 2. DocumentReference (the document itself)
    push({
      resourceType: 'DocumentReference',
      id: recId,
      meta: { profile: ['https://ndhm.gov.in/fhir/R4/StructureDefinition/document-reference'] },
      status: 'current',
      type: { coding: [{ system: 'http://snomed.info/sct', code: CONDITION_TYPES[rec.type] || 'Other', display: rec.type }] },
      date: dt(rec.date || rec.createdAt?.slice(0, 10)),
      description: rec.title,
      content: [{ attachment: { title: rec.title, data: rec.thumb || undefined } }],
      context: { facility: rec.provider?.facility || undefined, practiceType: rec.provider?.doctor || undefined },
    })

    // 3. Observation — one per lab test and vital
    for (const lab of rec.labs || []) {
      push({
        resourceType: 'Observation',
        id: id(),
        status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }],
        code: { text: lab.test },
        subject: { reference: `Patient/${patientId}` },
        effectiveDateTime: dt(rec.date),
        valueQuantity: toQuantity(lab.value, lab.unit),
        referenceRange: lab.referenceRange ? [{ text: lab.referenceRange }] : [],
        interpretation: [{ coding: [{ code: lab.flag?.toUpperCase() || 'UNK', display: lab.flag || 'unknown' }] }],
      })
    }
    for (const v of rec.vitals || []) {
      push({
        resourceType: 'Observation',
        id: id(),
        status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
        code: { text: v.name },
        subject: { reference: `Patient/${patientId}` },
        effectiveDateTime: dt(rec.date),
        valueQuantity: toQuantity(v.value, v.unit),
        interpretation: [{ coding: [{ code: v.flag?.toUpperCase() || 'UNK', display: v.flag || 'unknown' }] }],
      })
    }

    // 4. MedicationRequest — one per medicine
    for (const m of rec.medicines || []) {
      push({
        resourceType: 'MedicationRequest',
        id: id(),
        intent: 'order',
        status: 'active',
        subject: { reference: `Patient/${patientId}` },
        authoredOn: dt(rec.date),
        medicationCodeableConcept: { text: m.name },
        dosageInstruction: [
          {
            text: [m.dosage, m.frequency, m.duration, m.instructions].filter(Boolean).join(', '),
            timing: m.frequency ? { code: { text: m.frequency } } : undefined,
          },
        ],
      })
    }

    // 5. Condition — one per diagnosis
    for (const d of rec.diagnoses || []) {
      push({
        resourceType: 'Condition',
        id: id(),
        clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
        code: { coding: d.code ? [{ system: 'http://hl7.org/fhir/sid/icd-10', code: d.code }] : [], text: d.name },
        subject: { reference: `Patient/${patientId}` },
        onsetDateTime: dt(rec.date),
      })
    }
  }

  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: entries,
  }
}

/** Turn the inverse way: a FHIR Bundle back into our records. */
export function fromFhirBundle(bundle) {
  if (!bundle || bundle.resourceType !== 'Bundle' || !Array.isArray(bundle.entry)) {
    throw new Error('Not a FHIR Bundle')
  }

  const resources = bundle.entry.map((e) => e.resource).filter(Boolean)
  const patient = resources.find((r) => r.resourceType === 'Patient')

  const profile = {
    name: patient?.name?.[0]?.text || '',
    gender: patient?.gender === 'male' || patient?.gender === 'female' ? patient.gender : '',
    bloodGroup: '',
    conditions: [],
    allergies: [],
    abha: patient?.extension?.find((x) => x.url?.includes('abha-number'))?.valueString
      ? {
          number: patient.extension.find((x) => x.url?.includes('abha-number')).valueString,
          address: patient?.identifier?.[0]?.value || '',
        }
      : null,
  }

  const docs = resources.filter((r) => r.resourceType === 'DocumentReference')
  const observations = resources.filter((r) => r.resourceType === 'Observation')
  const meds = resources.filter((r) => r.resourceType === 'MedicationRequest')
  const conditions = resources.filter((r) => r.resourceType === 'Condition')

  const records = docs.map((doc) => {
    const date = (doc.date || '').slice(0, 10)
    return {
      id: doc.id || `rec_${id()}`,
      createdAt: new Date().toISOString(),
      source: 'fhir-import',
      type: inverseType(doc.type?.coding?.[0]?.code),
      title: doc.description || 'Imported record',
      date,
      provider: { doctor: doc.context?.practiceType || '', facility: doc.context?.facility || '' },
      medicines: meds
        .filter((m) => (m.authoredOn || '').slice(0, 10) === date)
        .map((m) => ({
          name: m.medicationCodeableConcept?.text || '',
          dosage: '',
          frequency: m.dosageInstruction?.[0]?.timing?.code?.text || '',
          duration: '',
          instructions: m.dosageInstruction?.[0]?.text || '',
        })),
      labs: observations
        .filter((o) => o.category?.[0]?.coding?.[0]?.code === 'laboratory' && (o.effectiveDateTime || '').slice(0, 10) === date)
        .map((o) => ({
          test: o.code?.text || '',
          value: o.valueQuantity?.value != null ? String(o.valueQuantity.value) : '',
          unit: o.valueQuantity?.unit || '',
          referenceRange: o.referenceRange?.[0]?.text || '',
          flag: (o.interpretation?.[0]?.coding?.[0]?.code || 'unknown').toLowerCase(),
        })),
      vitals: observations
        .filter((o) => o.category?.[0]?.coding?.[0]?.code === 'vital-signs' && (o.effectiveDateTime || '').slice(0, 10) === date)
        .map((o) => ({
          name: o.code?.text || '',
          value: o.valueQuantity?.value != null ? String(o.valueQuantity.value) : '',
          unit: o.valueQuantity?.unit || '',
          flag: (o.interpretation?.[0]?.coding?.[0]?.code || 'unknown').toLowerCase(),
        })),
      diagnoses: conditions
        .filter((c) => (c.onsetDateTime || '').slice(0, 10) === date)
        .map((c) => ({ name: c.code?.text || '', code: c.code?.coding?.[0]?.code || '' })),
      notes: '',
      summary: '',
      summaryLang: '',
      thumb: doc.content?.[0]?.attachment?.data || '',
    }
  })

  return { profile: { ...profile, ...profile, conditions: profile.conditions, allergies: profile.allergies }, records }
}

function toQuantity(value, unit) {
  const num = parseFloat(String(value).replace(/[^\d.\-]/g, ''))
  return Number.isFinite(num) ? { value: num, unit: unit || undefined, system: `${SYSTEM}/units` } : { value: 0, unit: unit || undefined }
}

function inverseType(code) {
  const map = {
    Laboratory: 'lab_report',
    Medication: 'prescription',
    'Discharge-summary': 'discharge_summary',
    'Diagnostic-imaging': 'imaging_report',
    Other: 'other',
  }
  return map[code] || 'other'
}
