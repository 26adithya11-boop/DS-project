export type Department = 'ER' | 'OR';

export type EsiLevel = 1 | 2 | 3 | 4 | 5;

export interface Vitals {
  heartRate: number;        // bpm (60-100)
  systolicBp: number;       // mmHg (90-120)
  diastolicBp: number;      // mmHg (60-80)
  oxygenSat: number;        // % (95-100)
  respRate: number;         // breaths/min (12-20)
  temperature: number;      // Celsius (36.5-37.5)
  gcs: number;              // Glasgow Coma Scale (3-15)
  painScore: number;        // 0-10
  injurySeverity: number;   // ISS Injury Severity Score (1-75)
}

export type DeteriorationStatus = 'STABLE' | 'DETERIORATING' | 'CRITICAL_ARREST' | 'IMPROVING';

export interface VitalHistoryPoint {
  timestamp: number;
  simTimeFormatted: string;
  heartRate: number;
  systolicBp: number;
  diastolicBp: number;
  oxygenSat: number;
  respRate: number;
  calculatedUrgency: number;
}

export interface Patient {
  id: number;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  department: Department;
  chiefComplaint: string;
  vitals: Vitals;
  calculatedUrgency: number; // 1.000 = Most urgent, 5.000 = Least urgent
  esiLevel: EsiLevel;
  arrivalTime: number;       // Timestamp
  waitTimeSeconds: number;
  notes: string;
  deteriorationStatus: DeteriorationStatus;
  ecgRhythm: 'NSR' | 'SINUS_TACHY' | 'SINUS_BRADY' | 'AFIB' | 'VFIB' | 'ASYSTOLE';
  heapIndex?: number;
  vitalsHistory: VitalHistoryPoint[];
}

export interface BedSlot {
  id: string;
  name: string;
  department: Department;
  roomType: 'TRAUMA_RESUS' | 'ACUTE_CARE' | 'OR_SUITE' | 'ICU_STEPDOWN';
  patient: Patient | null;
  assignedStaff: {
    doctor: string;
    nurse: string;
    role: string;
  };
  treatmentTotalDuration: number; // in simulation seconds
  treatmentElapsedSeconds: number;
  status: 'AVAILABLE' | 'IN_TREATMENT' | 'CRITICAL_RESUS' | 'CLOSING_DISCHARGE';
}

export interface HeapTraceStep {
  id: string;
  timestamp: number;
  action: 'INSERT_PUSH' | 'COMPARE' | 'SWAP' | 'EXTRACT_ROOT' | 'RESTORED' | 'DECREASE_KEY';
  targetIndex: number;
  parentIndex?: number;
  patientId: number;
  patientName: string;
  urgencyA: number;
  urgencyB?: number;
  cCodeLine: number;
  explanation: string;
}

export interface HospitalMetrics {
  totalTriaged: number;
  totalTreated: number;
  totalDischarged: number;
  totalTransferredIcu: number;
  totalTransferredOr: number;
  totalHeapSwaps: number;
  averageWaitTimeSec: number;
  codeRedCount: number;
  deteriorationAlerts: number;
  mciCount: number;
}

export interface TriageBreakdown {
  baseScore: number;
  hrPenalty: number;
  bpPenalty: number;
  spo2Penalty: number;
  respPenalty: number;
  gcsPenalty: number;
  issPenalty: number;
  painPenalty: number;
  departmentAdjustment: number;
  finalScore: number;
  esiLevel: EsiLevel;
  clinicalRationale: string;
}

export type ClinicalEventType =
  | 'TRIAGE_INTAKE'
  | 'DISCHARGE'
  | 'TRANSFER_ICU'
  | 'TRANSFER_OR'
  | 'CRITICAL_RESUS'
  | 'CODE_RED_MCI';

export interface ShiftEvent {
  id: string;
  timestamp: number;
  simSeconds: number;
  simHour: number;
  simTimeFormatted: string;
  type: ClinicalEventType;
  patientId: number;
  patientName: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  department: Department;
  chiefComplaint: string;
  esiLevel: EsiLevel;
  urgencyScore: number;
  destinationOrOutcome: string;
  attendingStaff?: string;
  bedName?: string;
  notes?: string;
}

export interface ShiftHourSummary {
  hourNumber: number;
  timeRange: string;
  totalTriaged: number;
  esiDistribution: Record<EsiLevel, number>;
  totalDischarges: number;
  totalTransfersIcu: number;
  totalTransfersOr: number;
  avgWaitTimeSeconds: number;
  peakUrgency: number;
  heapOperationsCount: number;
  events: ShiftEvent[];
}

export type FatigueTier = 'RESTED' | 'NOMINAL' | 'TIRED' | 'EXHAUSTED' | 'CRITICAL_FATIGUE';

export interface StaffFatigueState {
  enabled: boolean;
  doctorEfficiencyPct: number; // 40 - 100%
  nurseEfficiencyPct: number;  // 40 - 100%
  overallEfficiencyPct: number; // 40 - 100%
  effectiveRateMultiplier: number; // 0.40 - 1.00
  fatigueTier: FatigueTier;
  shiftHoursWorked: number;
}

