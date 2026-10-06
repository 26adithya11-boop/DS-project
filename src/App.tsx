/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PriorityQueueEngine } from './engine/cEngineSimulator';
import { generateInitialPatients, generateMassCasualtyWave, createPatientFromPreset, CLINICAL_PRESETS, ClinicalPreset } from './engine/clinicalScenarios';
import { INITIAL_BEDS } from './engine/hospitalBeds';
import { Patient, BedSlot, HeapTraceStep, HospitalMetrics, Vitals, ShiftEvent, StaffFatigueState, FatigueTier } from './types/hospital';
import { Header } from './components/Header';
import { SimulationControls } from './components/SimulationControls';
import { HeapVisualizer } from './components/HeapVisualizer';
import { HospitalFloor } from './components/HospitalFloor';
import { PatientDetailModal } from './components/PatientDetailModal';
import { PatientIntakeModal } from './components/PatientIntakeModal';
import { CEngineInspector } from './components/CEngineInspector';
import { ClinicalScenariosView } from './components/ClinicalScenariosView';
import { CloudRecordsView } from './components/CloudRecordsView';
import { HospitalCapacityGauge } from './components/HospitalCapacityGauge';
import { ShiftReportView } from './components/ShiftReportView';
import { AiRecommendationsModal, ClinicalMove } from './components/AiRecommendationsModal';
import { soundEngine } from './utils/audioEngine';
import { auth, loginWithGoogle, logoutUser, saveTriageRecordToFirestore, testFirestoreConnection } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { AlertTriangle, Siren, Activity, CheckCircle, ArrowDownUp } from 'lucide-react';

export default function App() {
  // Engine instance reference
  const pqRef = useRef<PriorityQueueEngine>(new PriorityQueueEngine(generateInitialPatients()));

  // Active view state
  const [activeView, setActiveView] = useState<'dashboard' | 'hospital' | 'c-kernel' | 'scenarios' | 'records' | 'shift-report'>('dashboard');

  // Firebase auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // React copies of engine state
  const [queue, setQueue] = useState<Patient[]>(() => pqRef.current.getSnapshot());
  const [beds, setBeds] = useState<BedSlot[]>(() => INITIAL_BEDS);
  const [traceLog, setTraceLog] = useState<HeapTraceStep[]>([]);
  const [recentStep, setRecentStep] = useState<HeapTraceStep | null>(null);

  // Simulation controls state
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [autoArriveEnabled, setAutoArriveEnabled] = useState<boolean>(false);
  const [simSecondsElapsed, setSimSecondsElapsed] = useState<number>(0);
  const [staffFatigueEnabled, setStaffFatigueEnabled] = useState<boolean>(true);
  const [shiftRestSecondsOffset, setShiftRestSecondsOffset] = useState<number>(0);

  // Shift events log state (initialized with starting patient cohort)
  const [shiftEvents, setShiftEvents] = useState<ShiftEvent[]>(() => {
    const initial = generateInitialPatients();
    return initial.map((p, idx) => ({
      id: `evt-init-${p.id}`,
      timestamp: Date.now() - (7 - idx) * 10000,
      simSeconds: 0,
      simHour: 1,
      simTimeFormatted: '00:00',
      type: 'TRIAGE_INTAKE' as const,
      patientId: p.id,
      patientName: p.name,
      age: p.age,
      gender: p.gender,
      department: p.department,
      chiefComplaint: p.chiefComplaint,
      esiLevel: p.esiLevel,
      urgencyScore: p.calculatedUrgency,
      destinationOrOutcome: 'Admitted into Min-Heap Priority Queue',
      attendingStaff: 'Dr. Mercer / Nurse Ramirez',
      notes: 'Initial clinical queue intake'
    }));
  });

  // Helper to record shift events
  const logShiftEvent = useCallback(
    (event: Omit<ShiftEvent, 'id' | 'timestamp' | 'simSeconds' | 'simHour' | 'simTimeFormatted'>) => {
      const now = Date.now();
      const simSec = simSecondsElapsed;
      const simHour = Math.max(1, Math.floor(simSec / 60) + 1);
      const mins = Math.floor(simSec / 60);
      const secs = simSec % 60;
      const simTimeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      const newEvt: ShiftEvent = {
        ...event,
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
        simSeconds: simSec,
        simHour,
        simTimeFormatted
      };

      setShiftEvents(prev => [newEvt, ...prev]);
    },
    [simSecondsElapsed]
  );

  // Metrics state
  const [metrics, setMetrics] = useState<HospitalMetrics>({
    totalTriaged: 7,
    totalTreated: 0,
    totalDischarged: 0,
    totalTransferredIcu: 0,
    totalTransferredOr: 0,
    totalHeapSwaps: 0,
    averageWaitTimeSec: 0,
    codeRedCount: 1,
    deteriorationAlerts: 0,
    mciCount: 0
  });

  // Active Alert banner state
  const [activeAlert, setActiveAlert] = useState<{ message: string; type: 'code-red' | 'info' | 'success' } | null>(null);

  // Selected patient for modal inspection
  const [inspectedPatient, setInspectedPatient] = useState<Patient | null>(null);

  // Intake modal state
  const [isIntakeOpen, setIsIntakeOpen] = useState<boolean>(false);

  // AI recommendations modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // Listen to Firebase Auth state & test connection on mount
  useEffect(() => {
    testFirestoreConnection();
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Helper to record trace steps
  const recordStep = useCallback((step: HeapTraceStep) => {
    setRecentStep(step);
    setTraceLog(prev => [...prev.slice(-99), step]);
    soundEngine.playHeapSwapTone(step.targetIndex);
  }, []);

  // Update React queue state from engine
  const syncQueue = useCallback(() => {
    setQueue(pqRef.current.getSnapshot());
  }, []);

  // Show temporary banner
  const triggerBanner = (message: string, type: 'code-red' | 'info' | 'success' = 'info') => {
    setActiveAlert({ message, type });
    if (type === 'code-red') {
      soundEngine.playCodeRed();
    }
    setTimeout(() => {
      setActiveAlert(null);
    }, 5500);
  };

  // Real-time nurse & doctor shift fatigue simulation model
  const staffFatigueState = useMemo<StaffFatigueState>(() => {
    if (!staffFatigueEnabled) {
      return {
        enabled: false,
        doctorEfficiencyPct: 100,
        nurseEfficiencyPct: 100,
        overallEfficiencyPct: 100,
        effectiveRateMultiplier: 1.0,
        fatigueTier: 'RESTED',
        shiftHoursWorked: Math.floor(simSecondsElapsed / 60) + 1
      };
    }

    const activeShiftSec = Math.max(0, simSecondsElapsed - shiftRestSecondsOffset);
    const occupiedCount = beds.filter(b => b.patient !== null).length;
    const bedLoadFactor = beds.length > 0 ? occupiedCount / beds.length : 0.5;

    // Doctors: cognitive & procedural fatigue, impacted by patient acuity & occupancy
    const doctorDrop = (activeShiftSec * 0.28) + (bedLoadFactor * activeShiftSec * 0.15);
    const doctorEfficiencyPct = Math.max(35, Math.min(100, Math.round(100 - doctorDrop)));

    // Nurses: continuous bedside care, medication administration, vitals monitoring
    const nurseDrop = (activeShiftSec * 0.32) + (bedLoadFactor * activeShiftSec * 0.18);
    const nurseEfficiencyPct = Math.max(35, Math.min(100, Math.round(100 - nurseDrop)));

    // Combined team efficiency
    const overallEfficiencyPct = Math.round(doctorEfficiencyPct * 0.45 + nurseEfficiencyPct * 0.55);
    const effectiveRateMultiplier = Math.max(0.35, Math.round((overallEfficiencyPct / 100) * 100) / 100);

    let fatigueTier: FatigueTier = 'RESTED';
    if (overallEfficiencyPct < 45) {
      fatigueTier = 'CRITICAL_FATIGUE';
    } else if (overallEfficiencyPct < 60) {
      fatigueTier = 'EXHAUSTED';
    } else if (overallEfficiencyPct < 75) {
      fatigueTier = 'TIRED';
    } else if (overallEfficiencyPct < 90) {
      fatigueTier = 'NOMINAL';
    }

    return {
      enabled: true,
      doctorEfficiencyPct,
      nurseEfficiencyPct,
      overallEfficiencyPct,
      effectiveRateMultiplier,
      fatigueTier,
      shiftHoursWorked: Math.floor(simSecondsElapsed / 60) + 1
    };
  }, [staffFatigueEnabled, simSecondsElapsed, shiftRestSecondsOffset, beds]);

  const staffFatigueRef = useRef(staffFatigueState);
  useEffect(() => {
    staffFatigueRef.current = staffFatigueState;
  }, [staffFatigueState]);

  // Alert when staff crosses into tired or exhausted tiers
  const prevTierRef = useRef<FatigueTier>(staffFatigueState.fatigueTier);
  useEffect(() => {
    if (!staffFatigueEnabled) return;
    const prevTier = prevTierRef.current;
    const currentTier = staffFatigueState.fatigueTier;
    if (prevTier !== currentTier) {
      prevTierRef.current = currentTier;
      if (currentTier === 'TIRED') {
        triggerBanner('Staff Shift Fatigue Alert: Team efficiency dropped to TIRED level (~70%). Bed treatment pace decelerating.', 'info');
      } else if (currentTier === 'EXHAUSTED') {
        triggerBanner('Staff Shift Fatigue Alert: Team EXHAUSTED (~55% Eff). Bed turnaround times delayed by ~45%. Rotate shift soon!', 'code-red');
      } else if (currentTier === 'CRITICAL_FATIGUE') {
        triggerBanner('CRITICAL STAFF FATIGUE: Doctors & Nurses under extreme exhaustion (<45% Eff). Emergency shift handover recommended!', 'code-red');
      }
    }
  }, [staffFatigueEnabled, staffFatigueState.fatigueTier]);

  const handleToggleStaffFatigue = useCallback(() => {
    setStaffFatigueEnabled(prev => {
      const next = !prev;
      triggerBanner(
        next
          ? 'Staff Availability: Dynamic Fatigue ENABLED · Efficiency decreases over simulation time, impacting patient bed treatment.'
          : 'Staff Availability: Fixed (100%) · Fatigue simulation disabled.',
        next ? 'info' : 'success'
      );
      return next;
    });
  }, []);

  const handleRestStaffShift = useCallback(() => {
    setShiftRestSecondsOffset(simSecondsElapsed);
    triggerBanner(
      'Staff Handover & Rest Break completed! Doctors and nurses rotated — Stamina restored to 100%.',
      'success'
    );
  }, [simSecondsElapsed]);

  // Extract root patient (highest priority)
  const handleExtractRoot = useCallback(() => {
    const extracted = pqRef.current.extractNextEvent(recordStep);
    if (extracted) {
      syncQueue();
      setMetrics(m => ({ ...m, totalTreated: m.totalTreated + 1, totalHeapSwaps: pqRef.current.totalSwaps }));

      // Find an available bed for this patient
      setBeds(prevBeds => {
        const availableBedIdx = prevBeds.findIndex(
          b => b.department === extracted.department && b.patient === null
        );

        if (availableBedIdx !== -1) {
          const updated = [...prevBeds];
          updated[availableBedIdx] = {
            ...updated[availableBedIdx],
            patient: extracted,
            treatmentElapsedSeconds: 0,
            status: extracted.esiLevel === 1 ? 'CRITICAL_RESUS' : 'IN_TREATMENT'
          };
          triggerBanner(
            `Extracted Root #${extracted.id} (${extracted.name}, ESI-${extracted.esiLevel}) -> Assigned to ${updated[availableBedIdx].name}`,
            extracted.esiLevel === 1 ? 'code-red' : 'info'
          );
          return updated;
        } else {
          // If all department beds full, try any available bed
          const anyBedIdx = prevBeds.findIndex(b => b.patient === null);
          if (anyBedIdx !== -1) {
            const updated = [...prevBeds];
            updated[anyBedIdx] = {
              ...updated[anyBedIdx],
              patient: extracted,
              treatmentElapsedSeconds: 0,
              status: 'IN_TREATMENT'
            };
            triggerBanner(
              `Admitted #${extracted.id} to Surge Overflow Bed: ${updated[anyBedIdx].name}`,
              'info'
            );
            return updated;
          } else {
            triggerBanner(
              `Extracted #${extracted.id} from Heap, but all beds are currently occupied! Direct treatment in trauma holding.`,
              'code-red'
            );
            return prevBeds;
          }
        }
      });
    }
  }, [recordStep, syncQueue]);

  // Insert a patient into heap
  const handleAdmitPatient = useCallback((patient: Patient) => {
    const swaps = pqRef.current.insertPatient(patient, recordStep);
    syncQueue();
    setMetrics(m => ({
      ...m,
      totalTriaged: m.totalTriaged + 1,
      totalHeapSwaps: pqRef.current.totalSwaps,
      codeRedCount: patient.esiLevel === 1 ? m.codeRedCount + 1 : m.codeRedCount
    }));

    logShiftEvent({
      type: 'TRIAGE_INTAKE',
      patientId: patient.id,
      patientName: patient.name,
      age: patient.age,
      gender: patient.gender,
      department: patient.department,
      chiefComplaint: patient.chiefComplaint,
      esiLevel: patient.esiLevel,
      urgencyScore: patient.calculatedUrgency,
      destinationOrOutcome: 'Admitted into Min-Heap Queue',
      notes: `Triage evaluation completed in ${swaps} heap swaps`
    });

    if (currentUser) {
      saveTriageRecordToFirestore({
        id: `rec-${patient.id}-${Date.now()}`,
        patientName: patient.name,
        age: patient.age,
        department: patient.department,
        chiefComplaint: patient.chiefComplaint,
        urgencyScore: patient.calculatedUrgency,
        esiLevel: patient.esiLevel,
        heartRate: patient.vitals.heartRate,
        systolicBp: patient.vitals.systolicBp,
        diastolicBp: patient.vitals.diastolicBp,
        oxygenSat: patient.vitals.oxygenSat,
        treatmentOutcome: 'Admitted into Min-Heap',
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
      }).catch(err => console.error('Failed to auto-save to Firestore:', err));
    }

    triggerBanner(
      `Patient #${patient.id} admitted (${patient.name}) · Bubbled up in ${swaps} swaps (Urgency: ${patient.calculatedUrgency.toFixed(3)}, ESI-${patient.esiLevel})`,
      patient.esiLevel === 1 ? 'code-red' : 'info'
    );
  }, [currentUser, logShiftEvent, recordStep, syncQueue]);

  // Mass casualty event
  const handleTriggerMassCasualty = useCallback(() => {
    const victims = generateMassCasualtyWave();
    victims.forEach(v => {
      pqRef.current.insertPatient(v, recordStep);
      logShiftEvent({
        type: 'CODE_RED_MCI',
        patientId: v.id,
        patientName: v.name,
        age: v.age,
        gender: v.gender,
        department: v.department,
        chiefComplaint: v.chiefComplaint,
        esiLevel: v.esiLevel,
        urgencyScore: v.calculatedUrgency,
        destinationOrOutcome: 'MCI Code Red - Priority Queue Insertion',
        notes: 'Multi-casualty disaster wave triage intake'
      });
    });
    syncQueue();
    setMetrics(m => ({
      ...m,
      totalTriaged: m.totalTriaged + victims.length,
      totalHeapSwaps: pqRef.current.totalSwaps,
      codeRedCount: m.codeRedCount + victims.length,
      mciCount: m.mciCount + 1
    }));
    triggerBanner(
      `CODE RED: MASS CASUALTY INCIDENT (MCI)! Triaged ${victims.length} severe trauma casualties into Min-Heap in O(K log N)!`,
      'code-red'
    );
  }, [logShiftEvent, recordStep, syncQueue]);

  // Update vitals for a patient (causes dynamic re-triage and decrease-key)
  const handleUpdateVitals = useCallback((patientId: number, newVitals: Vitals) => {
    // Check if patient is in the heap
    const updatedInQueue = pqRef.current.updatePatientVitals(patientId, newVitals, recordStep);
    if (updatedInQueue) {
      syncQueue();
      setMetrics(m => ({
        ...m,
        totalHeapSwaps: pqRef.current.totalSwaps,
        deteriorationAlerts: m.deteriorationAlerts + 1
      }));

      // Update inspected patient if currently open
      setInspectedPatient(prev => {
        if (prev && prev.id === patientId) {
          const triage = PriorityQueueEngine.calculateTriageScore(newVitals, prev.department);
          const history = prev.vitalsHistory ? [...prev.vitalsHistory] : [];
          history.push({
            timestamp: Date.now(),
            simTimeFormatted: 'NOW',
            heartRate: newVitals.heartRate,
            systolicBp: newVitals.systolicBp,
            diastolicBp: newVitals.diastolicBp,
            oxygenSat: newVitals.oxygenSat,
            respRate: newVitals.respRate,
            calculatedUrgency: triage.finalScore
          });
          return {
            ...prev,
            vitals: newVitals,
            calculatedUrgency: triage.finalScore,
            esiLevel: triage.esiLevel,
            vitalsHistory: history
          };
        }
        return prev;
      });

      triggerBanner(
        `Vitals shift for Patient #${patientId}: Min-Heap re-evaluated & re-balanced in O(log N)!`,
        'code-red'
      );
      return;
    }

    // Otherwise check if in a bed
    setBeds(prevBeds =>
      prevBeds.map(b => {
        if (b.patient && b.patient.id === patientId) {
          const triage = PriorityQueueEngine.calculateTriageScore(newVitals, b.patient.department);
          const history = b.patient.vitalsHistory ? [...b.patient.vitalsHistory] : [];
          history.push({
            timestamp: Date.now(),
            simTimeFormatted: 'NOW',
            heartRate: newVitals.heartRate,
            systolicBp: newVitals.systolicBp,
            diastolicBp: newVitals.diastolicBp,
            oxygenSat: newVitals.oxygenSat,
            respRate: newVitals.respRate,
            calculatedUrgency: triage.finalScore
          });
          const updatedPatient = {
            ...b.patient,
            vitals: newVitals,
            calculatedUrgency: triage.finalScore,
            esiLevel: triage.esiLevel,
            vitalsHistory: history
          };
          if (inspectedPatient?.id === patientId) {
            setInspectedPatient(updatedPatient);
          }
          return {
            ...b,
            patient: updatedPatient
          };
        }
        return b;
      })
    );
  }, [inspectedPatient, recordStep, syncQueue]);

  // Admit patient directly to a specific bed
  const handleAdmitToBed = useCallback((bedId: string) => {
    const targetBed = beds.find(b => b.id === bedId);
    if (!targetBed) return;

    // Filter next patient matching department if possible, otherwise next root
    const snapshot = pqRef.current.getSnapshot();
    const deptMatch = snapshot.find(p => p.department === targetBed.department);
    const chosenPatient = deptMatch || pqRef.current.peek();

    if (chosenPatient) {
      pqRef.current.removePatient(chosenPatient.id);
      syncQueue();

      setBeds(prev =>
        prev.map(b =>
          b.id === bedId
            ? {
                ...b,
                patient: chosenPatient,
                treatmentElapsedSeconds: 0,
                status: chosenPatient.esiLevel === 1 ? 'CRITICAL_RESUS' : 'IN_TREATMENT'
              }
            : b
        )
      );

      triggerBanner(
        `Admitted #${chosenPatient.id} (${chosenPatient.name}) to ${targetBed.name}`,
        'info'
      );
    }
  }, [beds, syncQueue]);

  // Discharge or transfer a bed
  const handleDischargeBed = useCallback(
    (bedId: string, outcomeType: 'DISCHARGE' | 'TRANSFER_ICU' | 'TRANSFER_OR' = 'DISCHARGE') => {
      setBeds(prev =>
        prev.map(b => {
          if (b.id === bedId && b.patient) {
            const outcomeLabel =
              outcomeType === 'TRANSFER_ICU'
                ? 'Transferred to Intensive Care Unit (ICU)'
                : outcomeType === 'TRANSFER_OR'
                ? 'Emergency Transfer to OR Surgical Suite'
                : 'Stabilized & Discharged Home';

            if (currentUser) {
              saveTriageRecordToFirestore({
                id: `rec-disch-${b.patient.id}-${Date.now()}`,
                patientName: b.patient.name,
                age: b.patient.age,
                department: b.patient.department,
                chiefComplaint: b.patient.chiefComplaint,
                urgencyScore: b.patient.calculatedUrgency,
                esiLevel: b.patient.esiLevel,
                heartRate: b.patient.vitals.heartRate,
                systolicBp: b.patient.vitals.systolicBp,
                diastolicBp: b.patient.vitals.diastolicBp,
                oxygenSat: b.patient.vitals.oxygenSat,
                treatmentOutcome: outcomeLabel,
                userId: currentUser.uid,
                createdAt: new Date().toISOString()
              }).catch(err => console.error('Failed to auto-save discharge to Firestore:', err));
            }

            logShiftEvent({
              type: outcomeType,
              patientId: b.patient.id,
              patientName: b.patient.name,
              age: b.patient.age,
              gender: b.patient.gender,
              department: b.patient.department,
              chiefComplaint: b.patient.chiefComplaint,
              esiLevel: b.patient.esiLevel,
              urgencyScore: b.patient.calculatedUrgency,
              destinationOrOutcome: outcomeLabel,
              bedName: b.name,
              attendingStaff: `${b.assignedStaff.doctor} / ${b.assignedStaff.nurse}`,
              notes:
                outcomeType === 'TRANSFER_ICU'
                  ? 'Hemodynamic monitoring transferred to ICU bed.'
                  : outcomeType === 'TRANSFER_OR'
                  ? 'Immediate surgical intervention indicated in theater.'
                  : 'Clinical protocol completed. Vital signs within normal parameters.'
            });

            if (outcomeType === 'TRANSFER_ICU') {
              setMetrics(m => ({ ...m, totalTransferredIcu: m.totalTransferredIcu + 1 }));
              triggerBanner(`Patient #${b.patient.id} (${b.patient.name}) escalated & transferred to ICU!`, 'info');
            } else if (outcomeType === 'TRANSFER_OR') {
              setMetrics(m => ({ ...m, totalTransferredOr: m.totalTransferredOr + 1 }));
              triggerBanner(`Patient #${b.patient.id} (${b.patient.name}) transferred to OR Suite for emergency surgery!`, 'code-red');
            } else {
              setMetrics(m => ({ ...m, totalDischarged: m.totalDischarged + 1 }));
              triggerBanner(`Patient #${b.patient.id} (${b.patient.name}) successfully treated & discharged from ${b.name}!`, 'success');
            }

            return {
              ...b,
              patient: null,
              treatmentElapsedSeconds: 0,
              status: 'AVAILABLE'
            };
          }
          return b;
        })
      );
    },
    [currentUser, logShiftEvent]
  );

  // Direct admit from modal
  const handleDirectAdmitFromModal = useCallback((patientId: number) => {
    const p = queue.find(item => item.id === patientId);
    if (!p) return;

    const availableBed = beds.find(b => b.patient === null && b.department === p.department) || beds.find(b => b.patient === null);
    if (availableBed) {
      pqRef.current.removePatient(patientId);
      syncQueue();
      setBeds(prev =>
        prev.map(b =>
          b.id === availableBed.id
            ? {
                ...b,
                patient: p,
                treatmentElapsedSeconds: 0,
                status: 'IN_TREATMENT'
              }
            : b
        )
      );
      setInspectedPatient(null);
      triggerBanner(`Admitted #${p.id} to ${availableBed.name}`, 'info');
    } else {
      triggerBanner(`All hospital beds currently at 100% capacity! Patient remains in Min-Heap priority queue.`, 'code-red');
    }
  }, [beds, queue, syncQueue]);

  // Single-click implement AI-recommended operational moves
  const handleExecuteAiMoves = useCallback(
    (movesToExecute: ClinicalMove[]) => {
      let count = 0;
      // Sequential priority:
      // 1. DISCHARGE_BED (vacate capacity)
      // 2. TRANSFER_ICU / TRANSFER_OR (vacate frontline bays)
      // 3. ADMIT_TO_BED (admit top priority patients into available beds)
      const priorityOrder: Record<string, number> = {
        DISCHARGE_BED: 1,
        TRANSFER_ICU: 2,
        TRANSFER_OR: 3,
        ADMIT_TO_BED: 4,
      };

      const sorted = [...movesToExecute].sort(
        (a, b) => (priorityOrder[a.actionType] || 5) - (priorityOrder[b.actionType] || 5)
      );

      sorted.forEach(move => {
        if (move.actionType === 'DISCHARGE_BED' && move.bedId) {
          handleDischargeBed(move.bedId, 'DISCHARGE');
          count++;
        } else if (move.actionType === 'TRANSFER_ICU' && move.bedId) {
          handleDischargeBed(move.bedId, 'TRANSFER_ICU');
          count++;
        } else if (move.actionType === 'TRANSFER_OR' && move.bedId) {
          handleDischargeBed(move.bedId, 'TRANSFER_OR');
          count++;
        } else if (move.actionType === 'ADMIT_TO_BED') {
          if (move.patientId && move.bedId) {
            const currentQueue = pqRef.current.getSnapshot();
            const p = currentQueue.find(item => item.id === move.patientId);
            if (p) {
              pqRef.current.removePatient(p.id);
              syncQueue();
              setBeds(prev =>
                prev.map(b =>
                  b.id === move.bedId
                    ? {
                        ...b,
                        patient: p,
                        treatmentElapsedSeconds: 0,
                        status: p.esiLevel === 1 ? 'CRITICAL_RESUS' : 'IN_TREATMENT',
                      }
                    : b
                )
              );
              count++;
            }
          } else {
            handleExtractRoot();
            count++;
          }
        }
      });

      triggerBanner(
        `Implemented ${count} AI-recommended moves! Hospital flow re-balanced and patients prioritized.`,
        'success'
      );
    },
    [handleDischargeBed, handleExtractRoot, syncQueue]
  );

  // Simulation tick step
  const executeTick = useCallback(() => {
    // Advance queue wait times
    pqRef.current.incrementWaitTimes();
    syncQueue();

    setSimSecondsElapsed(s => {
      const nextSec = s + 1;
      const mins = Math.floor(nextSec / 60);
      const secs = nextSec % 60;
      const simTimeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      // Periodically record vitals history
      if (nextSec % 2 === 0) {
        pqRef.current.recordTickHistory(simTimeStr);
        syncQueue();

        setBeds(prevBeds =>
          prevBeds.map(b => {
            if (b.patient) {
              const hist = b.patient.vitalsHistory ? [...b.patient.vitalsHistory] : [];
              const noise = Math.sin(Date.now() * 0.002 + b.patient.id) * 0.8;
              hist.push({
                timestamp: Date.now(),
                simTimeFormatted: simTimeStr,
                heartRate: Math.round(b.patient.vitals.heartRate + noise),
                systolicBp: Math.round(b.patient.vitals.systolicBp + noise * 1.2),
                diastolicBp: Math.round(b.patient.vitals.diastolicBp + noise * 0.6),
                oxygenSat: b.patient.vitals.oxygenSat,
                respRate: b.patient.vitals.respRate,
                calculatedUrgency: b.patient.calculatedUrgency
              });
              if (hist.length > 30) hist.shift();

              const updatedPatient = { ...b.patient, vitalsHistory: hist };
              if (inspectedPatient?.id === b.patient.id) {
                setInspectedPatient(updatedPatient);
              }
              return {
                ...b,
                patient: updatedPatient
              };
            }
            return b;
          })
        );
      }
      return nextSec;
    });

    // Advance beds treatment timers with staff fatigue pace impact
    setBeds(prevBeds =>
      prevBeds.map(b => {
        if (b.patient) {
          const progressIncrement = staffFatigueRef.current.enabled
            ? staffFatigueRef.current.effectiveRateMultiplier
            : 1;
          const nextElapsed = Math.min(
            b.treatmentTotalDuration,
            Math.round((b.treatmentElapsedSeconds + progressIncrement) * 100) / 100
          );
          return {
            ...b,
            treatmentElapsedSeconds: nextElapsed
          };
        }
        return b;
      })
    );

    // Auto-arrive occasional patients if enabled
    if (autoArriveEnabled && Math.random() < 0.12) {
      const randomPreset = CLINICAL_PRESETS[Math.floor(Math.random() * CLINICAL_PRESETS.length)];
      handleAdmitPatient(createPatientFromPreset(randomPreset));
    }
  }, [autoArriveEnabled, handleAdmitPatient, inspectedPatient, syncQueue]);

  // Discharge all stabilized beds
  const handleDischargeAllStabilized = useCallback(() => {
    let dischargedCount = 0;
    setBeds(prev =>
      prev.map(b => {
        if (b.patient && b.treatmentElapsedSeconds >= b.treatmentTotalDuration) {
          dischargedCount++;
          const outcomeLabel = 'Stabilized & Discharged (Capacity Relief)';
          if (currentUser) {
            saveTriageRecordToFirestore({
              id: `rec-disch-${b.patient.id}-${Date.now()}`,
              patientName: b.patient.name,
              age: b.patient.age,
              department: b.patient.department,
              chiefComplaint: b.patient.chiefComplaint,
              urgencyScore: b.patient.calculatedUrgency,
              esiLevel: b.patient.esiLevel,
              heartRate: b.patient.vitals.heartRate,
              systolicBp: b.patient.vitals.systolicBp,
              diastolicBp: b.patient.vitals.diastolicBp,
              oxygenSat: b.patient.vitals.oxygenSat,
              treatmentOutcome: outcomeLabel,
              userId: currentUser.uid,
              createdAt: new Date().toISOString()
            }).catch(err => console.error(err));
          }

          logShiftEvent({
            type: 'DISCHARGE',
            patientId: b.patient.id,
            patientName: b.patient.name,
            age: b.patient.age,
            gender: b.patient.gender,
            department: b.patient.department,
            chiefComplaint: b.patient.chiefComplaint,
            esiLevel: b.patient.esiLevel,
            urgencyScore: b.patient.calculatedUrgency,
            destinationOrOutcome: outcomeLabel,
            bedName: b.name,
            attendingStaff: b.assignedStaff.doctor,
            notes: 'Batch stabilized discharge to release bed capacity.'
          });

          return {
            ...b,
            patient: null,
            treatmentElapsedSeconds: 0,
            status: 'AVAILABLE'
          };
        }
        return b;
      })
    );
    if (dischargedCount > 0) {
      setMetrics(m => ({ ...m, totalDischarged: m.totalDischarged + dischargedCount }));
      triggerBanner(`Discharged ${dischargedCount} stabilized patient(s) to relieve bed capacity.`, 'success');
    }
  }, [currentUser, logShiftEvent]);

  // Master simulation timer loop
  useEffect(() => {
    if (!isRunning) return;

    const intervalMs = Math.max(150, Math.floor(1000 / speed));
    const timer = setInterval(() => {
      executeTick();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isRunning, speed, executeTick]);

  // Reset simulation
  const handleResetSimulation = () => {
    pqRef.current = new PriorityQueueEngine(generateInitialPatients());
    setQueue(pqRef.current.getSnapshot());
    setBeds(INITIAL_BEDS);
    setTraceLog([]);
    setRecentStep(null);
    setSimSecondsElapsed(0);
    setShiftRestSecondsOffset(0);
    setShiftEvents(() => {
      const initial = generateInitialPatients();
      return initial.map((p, idx) => ({
        id: `evt-init-${p.id}-${Date.now()}`,
        timestamp: Date.now() - (7 - idx) * 10000,
        simSeconds: 0,
        simHour: 1,
        simTimeFormatted: '00:00',
        type: 'TRIAGE_INTAKE' as const,
        patientId: p.id,
        patientName: p.name,
        age: p.age,
        gender: p.gender,
        department: p.department,
        chiefComplaint: p.chiefComplaint,
        esiLevel: p.esiLevel,
        urgencyScore: p.calculatedUrgency,
        destinationOrOutcome: 'Admitted into Min-Heap Priority Queue',
        attendingStaff: 'Dr. Mercer / Nurse Ramirez',
        notes: 'Initial clinical queue intake'
      }));
    });
    setMetrics({
      totalTriaged: 7,
      totalTreated: 0,
      totalDischarged: 0,
      totalTransferredIcu: 0,
      totalTransferredOr: 0,
      totalHeapSwaps: 0,
      averageWaitTimeSec: 0,
      codeRedCount: 1,
      deteriorationAlerts: 0,
      mciCount: 0
    });
    triggerBanner('Simulation reset to initial state.', 'info');
  };

  const nextPatientInQueue = pqRef.current.peek();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar Contract (Single wordmark, clean links, primary actions) */}
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenIntakeModal={() => setIsIntakeOpen(true)}
        onTriggerMassCasualty={handleTriggerMassCasualty}
        onOpenAiRecommendations={() => setIsAiModalOpen(true)}
        codeRedActive={metrics.codeRedCount > 3}
        currentUser={currentUser}
        onLogin={loginWithGoogle}
        onLogout={logoutUser}
      />

      {/* Global Alert Toast */}
      {activeAlert && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-lg border shadow-xl flex items-start gap-3 text-xs ${
              activeAlert.type === 'code-red'
                ? 'bg-rose-950/95 border-rose-500 text-rose-100 shadow-rose-950/50'
                : activeAlert.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-emerald-950/50'
                : 'bg-slate-900/95 border-slate-700 text-slate-200'
            }`}
          >
            {activeAlert.type === 'code-red' ? (
              <Siren className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
            ) : activeAlert.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Activity className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold">{activeAlert.message}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Simulation Control Ribbon */}
        <SimulationControls
          isRunning={isRunning}
          onToggleRunning={() => setIsRunning(r => !r)}
          onStepForward={executeTick}
          onReset={handleResetSimulation}
          speed={speed}
          onChangeSpeed={setSpeed}
          isMuted={isMuted}
          onToggleMute={() => {
            const next = !isMuted;
            setIsMuted(next);
            soundEngine.setMuted(next);
          }}
          metrics={metrics}
          autoArriveEnabled={autoArriveEnabled}
          onToggleAutoArrive={() => setAutoArriveEnabled(a => !a)}
          simSecondsElapsed={simSecondsElapsed}
          onOpenAiRecommendations={() => setIsAiModalOpen(true)}
          staffFatigueEnabled={staffFatigueEnabled}
          onToggleStaffFatigue={handleToggleStaffFatigue}
          staffFatigueState={staffFatigueState}
          onRestStaffShift={handleRestStaffShift}
        />

        {/* Dynamic Views */}
        {activeView === 'dashboard' && (
          <div className="space-y-6">
            {/* Hospital Bed Occupancy & Average Wait Time Telemetry (Gauge & Progress Bar) */}
            <HospitalCapacityGauge
              beds={beds}
              queue={queue}
              onDischargeAllStabilized={handleDischargeAllStabilized}
              onAdmitRootToAvailable={handleExtractRoot}
              onOpenAiRecommendations={() => setIsAiModalOpen(true)}
              staffFatigueState={staffFatigueState}
            />

            {/* Binary Min-Heap Visualizer (Tree & Array) */}
            <HeapVisualizer
              queue={queue}
              onSelectPatient={setInspectedPatient}
              onExtractRoot={handleExtractRoot}
              recentTraceStep={recentStep}
              heapSwapsCount={metrics.totalHeapSwaps}
            />

            {/* Quick Floor Peek */}
            <HospitalFloor
              beds={beds}
              onDischargeBed={handleDischargeBed}
              onAdmitPatientToBed={handleAdmitToBed}
              onSelectPatient={setInspectedPatient}
              hasWaitingPatients={queue.length > 0}
              nextPatientInQueue={nextPatientInQueue}
              staffFatigueState={staffFatigueState}
            />
          </div>
        )}

        {activeView === 'hospital' && (
          <div className="space-y-6">
            <HospitalCapacityGauge
              beds={beds}
              queue={queue}
              onDischargeAllStabilized={handleDischargeAllStabilized}
              onAdmitRootToAvailable={handleExtractRoot}
              onOpenAiRecommendations={() => setIsAiModalOpen(true)}
              staffFatigueState={staffFatigueState}
            />
            <HospitalFloor
              beds={beds}
              onDischargeBed={handleDischargeBed}
              onAdmitPatientToBed={handleAdmitToBed}
              onSelectPatient={setInspectedPatient}
              hasWaitingPatients={queue.length > 0}
              nextPatientInQueue={nextPatientInQueue}
              staffFatigueState={staffFatigueState}
            />
          </div>
        )}

        {activeView === 'c-kernel' && (
          <CEngineInspector
            traceLog={traceLog}
            currentHeapSize={queue.length}
          />
        )}

        {activeView === 'scenarios' && (
          <ClinicalScenariosView
            onInjectPreset={preset => {
              handleAdmitPatient(createPatientFromPreset(preset));
              setActiveView('dashboard');
            }}
          />
        )}

        {activeView === 'records' && (
          <CloudRecordsView
            currentUser={currentUser}
            onLogin={loginWithGoogle}
          />
        )}

        {activeView === 'shift-report' && (
          <ShiftReportView
            shiftEvents={shiftEvents}
            simSecondsElapsed={simSecondsElapsed}
            totalTriaged={metrics.totalTriaged}
            totalDischarged={metrics.totalDischarged}
            totalTransferredIcu={metrics.totalTransferredIcu}
            totalTransferredOr={metrics.totalTransferredOr}
            totalHeapSwaps={metrics.totalHeapSwaps}
            codeRedCount={metrics.codeRedCount}
            onAdvanceSimHour={() => setSimSecondsElapsed(s => s + 60)}
            staffFatigueState={staffFatigueState}
          />
        )}
      </main>

      {/* Patient Detail & Vital Telemetry Modal */}
      <PatientDetailModal
        patient={inspectedPatient}
        onClose={() => setInspectedPatient(null)}
        onUpdateVitals={handleUpdateVitals}
        onDirectAdmit={handleDirectAdmitFromModal}
      />

      {/* Patient Intake Modal */}
      <PatientIntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onAdmitPatient={handleAdmitPatient}
      />

      {/* AI Recommendations Orchestrator Modal */}
      <AiRecommendationsModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        queue={queue}
        beds={beds}
        metrics={metrics}
        onExecuteMoves={handleExecuteAiMoves}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            ER FLOW · Hospital ER & OR Priority Queue Simulator · Powered by C99 Min-Heap Engine
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Complexity: O(1) Root Peek · O(log N) Insert & Extract
          </div>
        </div>
      </footer>
    </div>
  );
}
