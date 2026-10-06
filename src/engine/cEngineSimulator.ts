import { Patient, Vitals, Department, EsiLevel, HeapTraceStep, TriageBreakdown } from '../types/hospital';

/**
 * PriorityQueue implementation directly following user specification and C Engine logic.
 * Urgency 1.000 = Immediate / Critical, 5.000 = Non-urgent (Min-Heap).
 */
export class PriorityQueueEngine {
  private events: Patient[] = [];
  public totalSwaps = 0;
  public totalInsertions = 0;
  public totalExtractions = 0;

  constructor(initialPatients: Patient[] = []) {
    for (const patient of initialPatients) {
      this.insertPatient(patient);
    }
  }

  /**
   * Calculate precise clinical urgency score (1.000 = critical, 5.000 = non-urgent)
   */
  public static calculateTriageScore(vitals: Vitals, dept: Department): TriageBreakdown {
    let score = 5.0;
    let rationaleParts: string[] = [];

    // 1. Hemodynamics (Blood Pressure)
    let bpPenalty = 0;
    if (vitals.systolicBp < 80) {
      bpPenalty = 2.2;
      rationaleParts.push('Profound Hypotension / Shock (SBP < 80)');
    } else if (vitals.systolicBp < 90) {
      bpPenalty = 1.4;
      rationaleParts.push('Hypotension (SBP < 90)');
    } else if (vitals.systolicBp > 210) {
      bpPenalty = 1.1;
      rationaleParts.push('Hypertensive Crisis (SBP > 210)');
    }

    // 2. Hypoxia (SpO2)
    let spo2Penalty = 0;
    if (vitals.oxygenSat < 85) {
      spo2Penalty = 2.4;
      rationaleParts.push('Critical Hypoxia (SpO2 < 85%)');
    } else if (vitals.oxygenSat < 90) {
      spo2Penalty = 1.6;
      rationaleParts.push('Moderate Hypoxia (SpO2 < 90%)');
    } else if (vitals.oxygenSat < 93) {
      spo2Penalty = 0.8;
      rationaleParts.push('Mild Hypoxia (SpO2 < 93%)');
    }

    // 3. Heart Rate
    let hrPenalty = 0;
    if (vitals.heartRate > 150 || vitals.heartRate < 40) {
      hrPenalty = 1.8;
      rationaleParts.push(vitals.heartRate > 150 ? 'Extreme Tachycardia (>150 bpm)' : 'Severe Bradycardia (<40 bpm)');
    } else if (vitals.heartRate > 125 || vitals.heartRate < 50) {
      hrPenalty = 1.0;
      rationaleParts.push('Marked Arrhythmia / Abnormal HR');
    }

    // 4. Respiratory Rate
    let respPenalty = 0;
    if (vitals.respRate > 36 || vitals.respRate < 8) {
      respPenalty = 1.5;
      rationaleParts.push('Impending Respiratory Arrest (RR extremes)');
    } else if (vitals.respRate > 26) {
      respPenalty = 0.7;
      rationaleParts.push('Tachypnea (RR > 26)');
    }

    // 5. Glasgow Coma Scale (Neurological)
    let gcsPenalty = 0;
    if (vitals.gcs <= 8) {
      gcsPenalty = 2.2;
      rationaleParts.push('Severe Coma / Loss of Airway Reflexes (GCS ≤ 8)');
    } else if (vitals.gcs <= 12) {
      gcsPenalty = 1.1;
      rationaleParts.push('Depressed Sensorium (GCS ≤ 12)');
    }

    // 6. Trauma ISS (Injury Severity Score)
    let issPenalty = 0;
    if (vitals.injurySeverity >= 25) {
      issPenalty = 2.0;
      rationaleParts.push('Major Polytrauma (ISS ≥ 25)');
    } else if (vitals.injurySeverity >= 15) {
      issPenalty = 1.2;
      rationaleParts.push('Significant Trauma (ISS ≥ 15)');
    } else if (vitals.injurySeverity >= 9) {
      issPenalty = 0.6;
      rationaleParts.push('Moderate Trauma (ISS ≥ 9)');
    }

    // 7. Pain Score
    let painPenalty = 0;
    if (vitals.painScore >= 8) {
      painPenalty = 0.5;
      rationaleParts.push('Severe Acute Pain (≥ 8/10)');
    }

    // 8. Department Surgical Urgency
    let deptAdjustment = 0;
    if (dept === 'OR') {
      deptAdjustment = 0.45;
      rationaleParts.push('Surgical Suite Route (OR Pre-op)');
    }

    const totalPenalties = bpPenalty + spo2Penalty + hrPenalty + respPenalty + gcsPenalty + issPenalty + painPenalty + deptAdjustment;
    score = Math.max(1.0, Math.min(5.0, 5.0 - totalPenalties));
    // Round to 3 decimal places for precision
    score = Math.round(score * 1000) / 1000;

    let esi: EsiLevel = 5;
    if (score <= 1.80) esi = 1;
    else if (score <= 2.80) esi = 2;
    else if (score <= 3.80) esi = 3;
    else if (score <= 4.40) esi = 4;
    else esi = 5;

    return {
      baseScore: 5.0,
      hrPenalty,
      bpPenalty,
      spo2Penalty,
      respPenalty,
      gcsPenalty,
      issPenalty,
      painPenalty,
      departmentAdjustment: deptAdjustment,
      finalScore: score,
      esiLevel: esi,
      clinicalRationale: rationaleParts.length > 0 ? rationaleParts.join(' · ') : 'Hemodynamically stable with normal parameters'
    };
  }

  // O(log n) - Insert and bubble up, optionally recording step traces for animation
  insertPatient(patient: Patient, traceCallback?: (step: HeapTraceStep) => void): number {
    const copy = { ...patient, heapIndex: this.events.length };
    this.events.push(copy);
    this.totalInsertions++;
    let i = this.events.length - 1;
    let swaps = 0;

    if (traceCallback) {
      traceCallback({
        id: `step-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        action: 'INSERT_PUSH',
        targetIndex: i,
        patientId: copy.id,
        patientName: copy.name,
        urgencyA: copy.calculatedUrgency,
        cCodeLine: 135,
        explanation: `Appended patient #${copy.id} (${copy.name}) at heap leaf index [${i}] (urgency: ${copy.calculatedUrgency.toFixed(3)})`
      });
    }

    // Bubble up to maintain Min-Heap property
    while (i > 0) {
      const parentIndex = Math.floor((i - 1) / 2);
      const parent = this.events[parentIndex];
      const current = this.events[i];

      if (traceCallback) {
        traceCallback({
          id: `step-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          action: 'COMPARE',
          targetIndex: i,
          parentIndex,
          patientId: current.id,
          patientName: current.name,
          urgencyA: current.calculatedUrgency,
          urgencyB: parent.calculatedUrgency,
          cCodeLine: 76,
          explanation: `Evaluating Min-Heap condition: parent[${parentIndex}] urgency (${parent.calculatedUrgency.toFixed(3)}) <= child[${i}] urgency (${current.calculatedUrgency.toFixed(3)})`
        });
      }

      if (parent.calculatedUrgency <= current.calculatedUrgency) {
        break; // Min-heap invariant satisfied
      }

      // Swap
      this.events[i] = parent;
      this.events[parentIndex] = current;
      this.events[i].heapIndex = i;
      this.events[parentIndex].heapIndex = parentIndex;
      swaps++;
      this.totalSwaps++;

      if (traceCallback) {
        traceCallback({
          id: `step-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          action: 'SWAP',
          targetIndex: parentIndex,
          parentIndex: i,
          patientId: current.id,
          patientName: current.name,
          urgencyA: current.calculatedUrgency,
          urgencyB: parent.calculatedUrgency,
          cCodeLine: 83,
          explanation: `SWAP: Child[${i}] is more critical than Parent[${parentIndex}]. Bubbled up to index [${parentIndex}].`
        });
      }

      i = parentIndex;
    }

    if (traceCallback) {
      traceCallback({
        id: `step-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        action: 'RESTORED',
        targetIndex: i,
        patientId: copy.id,
        patientName: copy.name,
        urgencyA: copy.calculatedUrgency,
        cCodeLine: 90,
        explanation: `Min-Heap property restored at index [${i}]. Bubble-up complete in ${swaps} swap(s).`
      });
    }

    return swaps;
  }

  // O(log n) - Restore heap property going downwards
  minHeapify(i: number, traceCallback?: (step: HeapTraceStep) => void): number {
    let smallest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    let swaps = 0;

    if (left < this.events.length && this.events[left].calculatedUrgency < this.events[smallest].calculatedUrgency) {
      smallest = left;
    }

    if (right < this.events.length && this.events[right].calculatedUrgency < this.events[smallest].calculatedUrgency) {
      smallest = right;
    }

    if (smallest !== i) {
      const temp = this.events[i];
      const target = this.events[smallest];
      this.events[i] = target;
      this.events[smallest] = temp;
      this.events[i].heapIndex = i;
      this.events[smallest].heapIndex = smallest;

      swaps++;
      this.totalSwaps++;

      if (traceCallback) {
        traceCallback({
          id: `step-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          action: 'SWAP',
          targetIndex: smallest,
          parentIndex: i,
          patientId: target.id,
          patientName: target.name,
          urgencyA: target.calculatedUrgency,
          urgencyB: temp.calculatedUrgency,
          cCodeLine: 115,
          explanation: `HEAPIFY SWAP: Node [${i}] was less critical than child [${smallest}]. Swapped downwards.`
        });
      }

      const subSwaps = this.minHeapify(smallest, traceCallback);
      swaps += subSwaps;
    }

    return swaps;
  }

  // O(log n) - Extract the highest priority patient (root of Min-Heap)
  extractNextEvent(traceCallback?: (step: HeapTraceStep) => void): Patient | null {
    if (this.events.length === 0) {
      return null;
    }

    this.totalExtractions++;

    if (this.events.length === 1) {
      const single = this.events.pop()!;
      if (traceCallback) {
        traceCallback({
          id: `step-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          action: 'EXTRACT_ROOT',
          targetIndex: 0,
          patientId: single.id,
          patientName: single.name,
          urgencyA: single.calculatedUrgency,
          cCodeLine: 160,
          explanation: `Extracted only patient #${single.id} from root. Queue now empty.`
        });
      }
      return single;
    }

    const root = this.events[0];
    const last = this.events.pop()!;

    if (traceCallback) {
      traceCallback({
        id: `step-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        action: 'EXTRACT_ROOT',
        targetIndex: 0,
        patientId: root.id,
        patientName: root.name,
        urgencyA: root.calculatedUrgency,
        cCodeLine: 168,
        explanation: `Extracted highest-priority patient #${root.id} (${root.name}) at root [0]. Replaced root with leaf [${this.events.length}].`
      });
    }

    this.events[0] = last;
    this.events[0].heapIndex = 0;
    this.minHeapify(0, traceCallback);

    return root;
  }

  // O(1) - Peek at highest priority patient without extraction
  peek(): Patient | null {
    return this.events.length > 0 ? this.events[0] : null;
  }

  // O(N + log N) - Dynamic decrease-key when patient vitals suddenly crash
  updatePatientVitals(patientId: number, newVitals: Vitals, traceCallback?: (step: HeapTraceStep) => void): boolean {
    const idx = this.events.findIndex(p => p.id === patientId);
    if (idx === -1) return false;

    const patient = this.events[idx];
    const oldScore = patient.calculatedUrgency;
    const triage = PriorityQueueEngine.calculateTriageScore(newVitals, patient.department);
    
    patient.vitals = newVitals;
    patient.calculatedUrgency = triage.finalScore;
    patient.esiLevel = triage.esiLevel;

    if (!patient.vitalsHistory) patient.vitalsHistory = [];
    patient.vitalsHistory.push({
      timestamp: Date.now(),
      simTimeFormatted: 'NOW',
      heartRate: newVitals.heartRate,
      systolicBp: newVitals.systolicBp,
      diastolicBp: newVitals.diastolicBp,
      oxygenSat: newVitals.oxygenSat,
      respRate: newVitals.respRate,
      calculatedUrgency: triage.finalScore
    });
    if (patient.vitalsHistory.length > 40) {
      patient.vitalsHistory.shift();
    }

    if (traceCallback) {
      traceCallback({
        id: `step-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        action: 'DECREASE_KEY',
        targetIndex: idx,
        patientId: patient.id,
        patientName: patient.name,
        urgencyA: triage.finalScore,
        urgencyB: oldScore,
        cCodeLine: 195,
        explanation: `Patient #${patient.id} vitals updated: Urgency shifted ${oldScore.toFixed(3)} -> ${triage.finalScore.toFixed(3)} (ESI Level ${triage.esiLevel})`
      });
    }

    if (triage.finalScore < oldScore) {
      // More critical -> Bubble up!
      let i = idx;
      while (i > 0) {
        const parentIndex = Math.floor((i - 1) / 2);
        if (this.events[parentIndex].calculatedUrgency <= this.events[i].calculatedUrgency) {
          break;
        }
        const temp = this.events[i];
        this.events[i] = this.events[parentIndex];
        this.events[parentIndex] = temp;
        this.events[i].heapIndex = i;
        this.events[parentIndex].heapIndex = parentIndex;
        this.totalSwaps++;
        i = parentIndex;
      }
    } else {
      // Less critical -> Heapify down
      this.minHeapify(idx, traceCallback);
    }

    return true;
  }

  // Remove patient directly (e.g. transfer or immediate cancellation)
  removePatient(patientId: number): Patient | null {
    const idx = this.events.findIndex(p => p.id === patientId);
    if (idx === -1) return null;

    const removed = this.events[idx];
    if (idx === this.events.length - 1) {
      this.events.pop();
      return removed;
    }

    const last = this.events.pop()!;
    this.events[idx] = last;
    this.events[idx].heapIndex = idx;
    this.minHeapify(idx);
    return removed;
  }

  getQueueSize(): number {
    return this.events.length;
  }

  getSnapshot(): Patient[] {
    return this.events.map((p, idx) => ({ ...p, heapIndex: idx }));
  }

  getTreeHeight(): number {
    if (this.events.length === 0) return 0;
    return Math.floor(Math.log2(this.events.length)) + 1;
  }

  recordTickHistory(simTimeFormatted: string): void {
    for (const patient of this.events) {
      if (!patient.vitalsHistory) {
        patient.vitalsHistory = [];
      }
      const noise = Math.sin(Date.now() * 0.002 + patient.id) * 0.8;
      patient.vitalsHistory.push({
        timestamp: Date.now(),
        simTimeFormatted,
        heartRate: Math.round(patient.vitals.heartRate + noise),
        systolicBp: Math.round(patient.vitals.systolicBp + noise * 1.2),
        diastolicBp: Math.round(patient.vitals.diastolicBp + noise * 0.6),
        oxygenSat: patient.vitals.oxygenSat,
        respRate: patient.vitals.respRate,
        calculatedUrgency: patient.calculatedUrgency
      });
      if (patient.vitalsHistory.length > 30) {
        patient.vitalsHistory.shift();
      }
    }
  }

  incrementWaitTimes(): void {
    for (const patient of this.events) {
      patient.waitTimeSeconds = (patient.waitTimeSeconds || 0) + 1;
    }
  }
}
