// Throwaway validation script for the FHIR mapper (client module, no browser APIs).
import { toFhirBundle, fromFhirBundle } from '../client/src/lib/fhir.js'
import { SAMPLE_RECORDS, SAMPLE_PROFILE } from '../client/src/lib/sample.js'

const bundle = toFhirBundle(SAMPLE_PROFILE, SAMPLE_RECORDS)
const types = bundle.entry.map((e) => e.resource.resourceType)
const counts = types.reduce((a, t) => ((a[t] = (a[t] || 0) + 1), a), {})

console.log('Bundle type :', bundle.resourceType, '/', bundle.type)
console.log('Entries     :', bundle.entry.length)
console.log('Resources   :', JSON.stringify(counts))

const patient = bundle.entry.find((e) => e.resource.resourceType === 'Patient').resource
console.log('ABHA ext    :', patient.extension?.[0]?.valueString)
console.log('ABHA addr   :', patient.identifier?.[0]?.value)

const obs = bundle.entry.find((e) => e.resource.resourceType === 'Observation').resource
console.log('Sample obs  :', obs.code.text, '=', obs.valueQuantity?.value, obs.valueQuantity?.unit, '→', obs.interpretation?.[0]?.coding?.[0]?.code)

const round = fromFhirBundle(bundle)
console.log('Round-trip  : records=' + round.records.length, 'name=' + round.profile.name, 'abha=' + (round.profile.abha?.number || 'none'))
const rt = round.records[0]
console.log('First rec   :', rt.type, '| labs=' + rt.labs.length, '| meds=' + rt.medicines.length, '| dx=' + rt.diagnoses.length)

const ok =
  bundle.resourceType === 'Bundle' &&
  bundle.entry.every((e) => e.resource?.resourceType) &&
  round.records.length === SAMPLE_RECORDS.length
console.log(ok ? '\nFHIR VALIDATION PASSED' : '\nFHIR VALIDATION FAILED')
process.exit(ok ? 0 : 1)
