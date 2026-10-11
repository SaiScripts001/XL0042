/**
 * Demo records so the timeline/chat can be shown instantly in a pitch
 * (and so judges can explore before uploading real documents).
 */

const now = new Date()
const daysAgo = (n) => new Date(now.getTime() - n * 86400000).toISOString().slice(0, 10)

export const SAMPLE_RECORDS = [
  {
    id: 'sample_lab_1',
    createdAt: new Date().toISOString(),
    source: 'sample',
    type: 'lab_report',
    title: 'Central Pathology Labs — Full Body Profile',
    date: daysAgo(6),
    provider: { doctor: 'Dr. Meera Patel', facility: 'Central Pathology Lab, Hyderabad' },
    patient: { name: '', age: '42', gender: 'Female' },
    medicines: [],
    labs: [
      { test: 'HbA1c', value: '8.2', unit: '%', referenceRange: '4.0 - 5.6', flag: 'high' },
      { test: 'Fasting Blood Glucose', value: '142', unit: 'mg/dL', referenceRange: '70 - 100', flag: 'high' },
      { test: 'Total Cholesterol', value: '218', unit: 'mg/dL', referenceRange: '< 200', flag: 'high' },
      { test: 'LDL Cholesterol', value: '146', unit: 'mg/dL', referenceRange: '< 100', flag: 'high' },
      { test: 'HDL Cholesterol', value: '44', unit: 'mg/dL', referenceRange: '40 - 60', flag: 'normal' },
      { test: 'Serum Creatinine', value: '0.9', unit: 'mg/dL', referenceRange: '0.6 - 1.1', flag: 'normal' },
      { test: 'Haemoglobin', value: '13.1', unit: 'g/dL', referenceRange: '12.0 - 16.0', flag: 'normal' },
    ],
    vitals: [],
    diagnoses: [{ name: 'Type 2 Diabetes Mellitus — poorly controlled', code: 'E11.9' }],
    notes: 'Repeat HbA1c after 3 months. Diet and exercise advice given.',
    summaryLang: 'en',
    summary:
      '**What this document is**\nA full-body blood profile from Central Pathology Lab, dated ' +
      daysAgo(6) + ', written by Dr. Meera Patel.\n\n**Key findings**\n- HbA1c 8.2% — above the printed range\n- Fasting glucose 142 mg/dL — above the printed range\n- Total cholesterol and LDL are both above the printed ranges\n- Kidney function (creatinine), haemoglobin and HDL are within the printed ranges\n\n**What the numbers mean**\n- HbA1c reflects your average blood sugar over roughly the last 3 months. 8.2% is higher than the 4.0–5.6% printed on your report, which suggests sugars have been running high for a while.\n- Fasting glucose is the sugar level after overnight fasting; 142 mg/dL is above the 70–100 range shown on your report.\n- LDL is often called "bad cholesterol". A higher value than the printed range is worth discussing because over time it can affect heart health.\n- Your creatinine is normal, which is reassuring for kidney function.\n\n**Your medicines**\nPlease take Metformin and Atorvastatin exactly as your doctor prescribed — do not change the dose on your own.\n\n**Questions for your doctor**\n- What HbA1c target should I aim for over the next 3 months?\n- Should my Metformin dose be reviewed at the next visit?\n- Do I need a lipid panel repeated after starting the statin?\n\nAI-generated summary for understanding only — not medical advice. Please consult a qualified doctor for decisions about your health. In an emergency call 108.',
  },
  {
    id: 'sample_rx_1',
    createdAt: new Date().toISOString(),
    source: 'sample',
    type: 'prescription',
    title: 'Prescription — Sunrise Clinic',
    date: daysAgo(6),
    provider: { doctor: 'Dr. Meera Patel', facility: 'Sunrise Clinic, Hyderabad' },
    patient: { name: '', age: '42', gender: 'Female' },
    medicines: [
      { name: 'Metformin 500 mg', dosage: '500 mg', frequency: 'twice daily', duration: '90 days', instructions: 'after meals' },
      { name: 'Atorvastatin 10 mg', dosage: '10 mg', frequency: 'once daily at night', duration: '90 days', instructions: 'after dinner' },
      { name: 'Vitamin D3 60 KIU', dosage: '60000 IU', frequency: 'once weekly', duration: '8 weeks', instructions: 'after breakfast' },
    ],
    labs: [],
    vitals: [],
    diagnoses: [{ name: 'Type 2 Diabetes', code: 'E11.9' }, { name: 'Dyslipidaemia', code: 'E78.5' }],
    notes: 'Review after 3 months with reports. Walking 30 min/day advised.',
    summaryLang: 'en',
    summary:
      '**What this document is**\nA prescription from Dr. Meera Patel at Sunrise Clinic, dated ' +
      daysAgo(6) + '.\n\n**Key findings**\n- Three medicines were prescribed\n- A 3-month review with reports is advised\n- Daily 30-minute walking was recommended\n\n**What the numbers mean**\nNo lab values appear on this document.\n\n**Your medicines**\n- **Metformin 500 mg** — commonly used to lower blood sugar in type 2 diabetes. Take twice daily after meals, exactly as prescribed.\n- **Atorvastatin 10 mg** — commonly used to lower cholesterol. Take once daily at night.\n- **Vitamin D3 60,000 IU** — a weekly supplement; take after breakfast.\n\n**Questions for your doctor**\n- Should I watch for any particular side effects from these medicines?\n- Can Metformin be taken with all my other medicines?\n- Which food changes would help most alongside this prescription?\n\nAI-generated summary for understanding only — not medical advice. Please consult a qualified doctor for decisions about your health. In an emergency call 108.',
  },
  {
    id: 'sample_dc_1',
    createdAt: new Date().toISOString(),
    source: 'sample',
    type: 'discharge_summary',
    title: 'Discharge Summary — Apollo Multi-speciality',
    date: daysAgo(210),
    provider: { doctor: 'Dr. R. Krishnan', facility: 'Apollo Multi-speciality Hospital' },
    patient: { name: '', age: '41', gender: 'Female' },
    medicines: [
      { name: 'Telmisartan 40 mg', dosage: '40 mg', frequency: 'once daily', duration: '30 days', instructions: 'after breakfast' },
    ],
    labs: [
      { test: 'Sodium', value: '138', unit: 'mmol/L', referenceRange: '135 - 145', flag: 'normal' },
      { test: 'Potassium', value: '4.1', unit: 'mmol/L', referenceRange: '3.5 - 5.1', flag: 'normal' },
    ],
    vitals: [{ name: 'Blood Pressure (at discharge)', value: '138/86', unit: 'mmHg', flag: 'normal' }],
    diagnoses: [{ name: 'Essential Hypertension', code: 'I10' }, { name: 'Episode of dizziness', code: 'R42' }],
    notes: 'Admitted for 2 days for evaluation of dizziness. ECG and 2D-echo within normal limits. Discharged stable. Follow-up after 4 weeks.',
    summaryLang: 'en',
    summary:
      '**What this document is**\nA discharge summary from Apollo Multi-speciality Hospital, dated ' +
      daysAgo(210) + ', for a 2-day admission caused by an episode of dizziness.\n\n**Key findings**\n- Admitted for evaluation of dizziness\n- ECG and 2D echocardiogram were reported within normal limits\n- Discharged in a stable condition with a 4-week follow-up\n\n**What the numbers mean**\n- Sodium and potassium are both inside the printed ranges, which is reassuring.\n- Blood pressure at discharge was 138/86 mmHg — near the usual target many doctors aim for, but worth tracking at home.\n\n**Your medicines**\n- **Telmisartan 40 mg** — commonly used to lower blood pressure. Take once daily after breakfast, exactly as prescribed.\n\n**Questions for your doctor**\n- Should I monitor my blood pressure at home, and what readings should concern me?\n- Could the dizziness have been related to my blood pressure medicines?\n- Is any follow-up testing due after this admission?\n\nAI-generated summary for understanding only — not medical advice. Please consult a qualified doctor for decisions about your health. In an emergency call 108.',
  },
]

export const SAMPLE_PROFILE = {
  name: 'Ananya Sharma',
  age: '42',
  gender: 'Female',
  bloodGroup: 'B+',
  conditions: ['Type 2 Diabetes', 'Hypertension'],
  allergies: ['Penicillin'],
  abha: {
    number: '52-4813-9076-2210',
    address: 'ananya42@abdm',
  },
}
