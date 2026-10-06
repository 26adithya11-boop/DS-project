import { Patient, Vitals, Department } from '../types/hospital';
import { PriorityQueueEngine } from './cEngineSimulator';

export interface ClinicalPreset {
  id: string;
  name: string;
  department: Department;
  chiefComplaint: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  vitals: Vitals;
  notes: string;
  ecgRhythm: 'NSR' | 'SINUS_TACHY' | 'SINUS_BRADY' | 'AFIB' | 'VFIB' | 'ASYSTOLE';
}

export const CLINICAL_PRESETS: ClinicalPreset[] = [
  {
    id: 'vf-arrest',
    name: 'Ventricular Fibrillation Cardiac Arrest',
    department: 'ER',
    chiefComplaint: 'Sudden collapse at transit terminal, pulseless, gasping agonal respirations',
    age: 58,
    gender: 'M',
    vitals: {
      heartRate: 195,
      systolicBp: 50,
      diastolicBp: 30,
      oxygenSat: 74,
      respRate: 6,
      temperature: 35.8,
      gcs: 3,
      painScore: 0,
      injurySeverity: 5
    },
    notes: 'Immediate CPR and Advanced Cardiac Life Support (ACLS) required. Defibrillator pads applied.',
    ecgRhythm: 'VFIB'
  },
  {
    id: 'tension-pneumo',
    name: 'Tension Pneumothorax & Hemothorax',
    department: 'ER',
    chiefComplaint: 'Blunt chest trauma following motorcycle collision, absent right breath sounds, tracheal deviation',
    age: 27,
    gender: 'M',
    vitals: {
      heartRate: 148,
      systolicBp: 75,
      diastolicBp: 45,
      oxygenSat: 81,
      respRate: 38,
      temperature: 36.6,
      gcs: 10,
      painScore: 9,
      injurySeverity: 28
    },
    notes: 'Impending obstructive shock. Requires immediate needle thoracostomy and tube thoracostomy.',
    ecgRhythm: 'SINUS_TACHY'
  },
  {
    id: 'ruptured-aortic-aneurysm',
    name: 'Ruptured Abdominal Aortic Aneurysm (AAA)',
    department: 'OR',
    chiefComplaint: 'Tearing mid-abdominal pain radiating to lumbar back, pulsatile mass, diaphoresis',
    age: 71,
    gender: 'M',
    vitals: {
      heartRate: 135,
      systolicBp: 78,
      diastolicBp: 42,
      oxygenSat: 88,
      respRate: 30,
      temperature: 35.9,
      gcs: 11,
      painScore: 10,
      injurySeverity: 36
    },
    notes: 'Exsanguinating hemorrhagic shock. Massive transfusion protocol activated; immediate emergent laparotomy.',
    ecgRhythm: 'SINUS_TACHY'
  },
  {
    id: 'acute-stemi',
    name: 'Acute STEMI (Inferior-Lateral STEMI)',
    department: 'ER',
    chiefComplaint: 'Crushing retrosternal chest pain with left jaw radiation, nausea, diaphoresis',
    age: 62,
    gender: 'F',
    vitals: {
      heartRate: 112,
      systolicBp: 154,
      diastolicBp: 96,
      oxygenSat: 91,
      respRate: 24,
      temperature: 37.0,
      gcs: 15,
      painScore: 9,
      injurySeverity: 6
    },
    notes: 'ECG shows 3mm ST-segment elevation in leads II, III, aVF. Door-to-balloon cath lab standby.',
    ecgRhythm: 'SINUS_TACHY'
  },
  {
    id: 'acute-ischemic-stroke',
    name: 'Acute Large-Vessel Ischemic Stroke (LVO)',
    department: 'ER',
    chiefComplaint: 'Right-sided hemiplegia, expressive aphasia, onset 45 minutes prior (NIHSS 18)',
    age: 69,
    gender: 'F',
    vitals: {
      heartRate: 88,
      systolicBp: 188,
      diastolicBp: 104,
      oxygenSat: 96,
      respRate: 18,
      temperature: 37.1,
      gcs: 12,
      painScore: 2,
      injurySeverity: 8
    },
    notes: 'Within 4.5-hour thrombolysis window. Emergency non-contrast head CT and CT angiography ordered.',
    ecgRhythm: 'AFIB'
  },
  {
    id: 'perforated-appendicitis',
    name: 'Perforated Appendicitis with Peritonitis',
    department: 'OR',
    chiefComplaint: 'Severe right lower quadrant pain, involuntary guarding, rebound tenderness, high fever',
    age: 24,
    gender: 'F',
    vitals: {
      heartRate: 124,
      systolicBp: 102,
      diastolicBp: 68,
      oxygenSat: 97,
      respRate: 22,
      temperature: 39.4,
      gcs: 15,
      painScore: 8,
      injurySeverity: 12
    },
    notes: 'Free peritoneal fluid and air on ultrasound. Requires laparoscopic appendectomy and irrigation.',
    ecgRhythm: 'SINUS_TACHY'
  },
  {
    id: 'open-femur-fracture',
    name: 'Open Gustilo-Anderson Grade IIIB Femur Fracture',
    department: 'OR',
    chiefComplaint: 'High-speed motor vehicle collision, bone protrusion through thigh, active hemorrhage',
    age: 33,
    gender: 'M',
    vitals: {
      heartRate: 118,
      systolicBp: 98,
      diastolicBp: 62,
      oxygenSat: 95,
      respRate: 20,
      temperature: 36.8,
      gcs: 14,
      painScore: 10,
      injurySeverity: 24
    },
    notes: 'Requires surgical debridement, IV antibiotics, and external fixation.',
    ecgRhythm: 'NSR'
  },
  {
    id: 'pediatric-asthma',
    name: 'Severe Pediatric Asthma Exacerbation',
    department: 'ER',
    chiefComplaint: '8-year-old with severe expiratory wheezing, subcostal retractions, unable to speak in sentences',
    age: 8,
    gender: 'M',
    vitals: {
      heartRate: 142,
      systolicBp: 106,
      diastolicBp: 70,
      oxygenSat: 89,
      respRate: 38,
      temperature: 37.3,
      gcs: 14,
      painScore: 4,
      injurySeverity: 3
    },
    notes: 'Continuous nebulized albuterol/ipratropium and IV methylprednisolone initiated.',
    ecgRhythm: 'SINUS_TACHY'
  },
  {
    id: 'forearm-laceration',
    name: 'Deep Forearm Glass Laceration',
    department: 'ER',
    chiefComplaint: 'Laceration from broken window, venous bleeding controlled with pressure dressing, sensation intact',
    age: 41,
    gender: 'M',
    vitals: {
      heartRate: 82,
      systolicBp: 128,
      diastolicBp: 78,
      oxygenSat: 99,
      respRate: 16,
      temperature: 36.7,
      gcs: 15,
      painScore: 6,
      injurySeverity: 4
    },
    notes: 'No tendon or neurovascular compromise on primary exam. Wound exploration and layered closure.',
    ecgRhythm: 'NSR'
  },
  {
    id: 'ankle-sprain',
    name: 'Inversion Ankle Sprain (Lateral Ligament)',
    department: 'ER',
    chiefComplaint: 'Twisted right ankle descending stairs, localized lateral malleolus edema, weight-bearing difficult',
    age: 29,
    gender: 'F',
    vitals: {
      heartRate: 72,
      systolicBp: 118,
      diastolicBp: 74,
      oxygenSat: 99,
      respRate: 14,
      temperature: 36.6,
      gcs: 15,
      painScore: 5,
      injurySeverity: 1
    },
    notes: 'Ottawa Ankle Rules negative for bony tenderness. RICE protocol, supportive splint, outpatient follow-up.',
    ecgRhythm: 'NSR'
  }
];

let globalPatientCounter = 100;

function generateInitialHistory(vitals: Vitals, arrivalOffsetSec: number, calculatedUrgency: number) {
  const points = [];
  const count = 6;
  const stepSec = Math.max(10, Math.floor((arrivalOffsetSec || 60) / count));

  for (let i = count - 1; i >= 0; i--) {
    const offset = i * stepSec;
    const simSec = Math.max(0, arrivalOffsetSec - offset);
    const mins = Math.floor(simSec / 60);
    const secs = simSec % 60;
    const simTimeFormatted = `T-${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const noise = Math.sin(i * 1.5) * 3;
    points.push({
      timestamp: Date.now() - offset * 1000,
      simTimeFormatted,
      heartRate: Math.round(Math.max(30, vitals.heartRate + noise)),
      systolicBp: Math.round(Math.max(50, vitals.systolicBp + noise * 1.5)),
      diastolicBp: Math.round(Math.max(30, vitals.diastolicBp + noise * 0.8)),
      oxygenSat: Math.round(Math.min(100, Math.max(70, vitals.oxygenSat + (i === 0 ? 0 : (i % 2 === 0 ? 1 : -1))))),
      respRate: vitals.respRate,
      calculatedUrgency
    });
  }
  return points;
}

export function createPatientFromPreset(preset: ClinicalPreset, arrivalOffsetSec: number = 0): Patient {
  const now = Date.now() - arrivalOffsetSec * 1000;
  const triage = PriorityQueueEngine.calculateTriageScore(preset.vitals, preset.department);

  return {
    id: ++globalPatientCounter,
    name: preset.name,
    age: preset.age,
    gender: preset.gender,
    department: preset.department,
    chiefComplaint: preset.chiefComplaint,
    vitals: { ...preset.vitals },
    calculatedUrgency: triage.finalScore,
    esiLevel: triage.esiLevel,
    arrivalTime: now,
    waitTimeSeconds: arrivalOffsetSec,
    notes: preset.notes,
    deteriorationStatus: triage.esiLevel === 1 ? 'CRITICAL_ARREST' : 'STABLE',
    ecgRhythm: preset.ecgRhythm,
    vitalsHistory: generateInitialHistory(preset.vitals, arrivalOffsetSec, triage.finalScore)
  };
}

export function generateInitialPatients(): Patient[] {
  // A balanced queue of 7 initial patients demonstrating different ESI levels and heap depth
  const initialPresets: { preset: ClinicalPreset; offsetSec: number }[] = [
    { preset: CLINICAL_PRESETS[3], offsetSec: 240 }, // Acute STEMI (ESI 2)
    { preset: CLINICAL_PRESETS[1], offsetSec: 180 }, // Tension Pneumo (ESI 1)
    { preset: CLINICAL_PRESETS[5], offsetSec: 540 }, // Appendicitis (ESI 3)
    { preset: CLINICAL_PRESETS[4], offsetSec: 320 }, // Stroke (ESI 2)
    { preset: CLINICAL_PRESETS[7], offsetSec: 620 }, // Pediatric Asthma (ESI 3)
    { preset: CLINICAL_PRESETS[8], offsetSec: 900 }, // Laceration (ESI 4)
    { preset: CLINICAL_PRESETS[9], offsetSec: 1200 } // Ankle Sprain (ESI 5)
  ];

  return initialPresets.map(({ preset, offsetSec }) => createPatientFromPreset(preset, offsetSec));
}

export function generateMassCasualtyWave(): Patient[] {
  const names = [
    'MCI Victim #1 - Severe Blast Lung',
    'MCI Victim #2 - Bilateral Traumatic Amputation',
    'MCI Victim #3 - Full-Thickness 40% TBSA Burns',
    'MCI Victim #4 - Crush Syndrome with Hyperkalemia',
    'MCI Victim #5 - Penetrating Shrapnel Neck Wound',
    'MCI Victim #6 - Flail Chest with Hemopneumothorax',
    'MCI Victim #7 - Traumatic Brain Injury with Uncal Herniation',
    'MCI Victim #8 - Open Pelvic Fracture ("Open Book")'
  ];

  return names.map((complaint, index) => {
    const isOr = index % 2 === 0;
    const vitals: Vitals = {
      heartRate: 130 + Math.floor(Math.random() * 45),
      systolicBp: 70 + Math.floor(Math.random() * 25),
      diastolicBp: 40 + Math.floor(Math.random() * 20),
      oxygenSat: 78 + Math.floor(Math.random() * 14),
      respRate: 30 + Math.floor(Math.random() * 15),
      temperature: 36.0,
      gcs: 7 + Math.floor(Math.random() * 6),
      painScore: 9,
      injurySeverity: 25 + Math.floor(Math.random() * 25)
    };
    const dept: Department = isOr ? 'OR' : 'ER';
    const triage = PriorityQueueEngine.calculateTriageScore(vitals, dept);

    return {
      id: ++globalPatientCounter,
      name: `MCI Trauma ${index + 1}`,
      age: 20 + Math.floor(Math.random() * 40),
      gender: Math.random() > 0.5 ? 'M' : 'F',
      department: dept,
      chiefComplaint: complaint,
      vitals,
      calculatedUrgency: triage.finalScore,
      esiLevel: triage.esiLevel,
      arrivalTime: Date.now(),
      waitTimeSeconds: 0,
      notes: 'Code Red Mass Casualty Incident triage protocol. Tagged Red/Immediate.',
      deteriorationStatus: 'CRITICAL_ARREST',
      ecgRhythm: 'SINUS_TACHY',
      vitalsHistory: generateInitialHistory(vitals, 0, triage.finalScore)
    };
  });
}
