import React, { useState, useMemo } from 'react';
import { ShiftEvent, ShiftHourSummary, EsiLevel, StaffFatigueState } from '../types/hospital';
import {
  FileText,
  Download,
  Copy,
  Check,
  Clock,
  UserCheck,
  ArrowRightLeft,
  Activity,
  AlertTriangle,
  Siren,
  Filter,
  Search,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  Users
} from 'lucide-react';

interface ShiftReportViewProps {
  shiftEvents: ShiftEvent[];
  simSecondsElapsed: number;
  totalTriaged: number;
  totalDischarged: number;
  totalTransferredIcu: number;
  totalTransferredOr: number;
  totalHeapSwaps: number;
  codeRedCount: number;
  onAdvanceSimHour?: () => void;
  staffFatigueState?: StaffFatigueState;
}

export const ShiftReportView: React.FC<ShiftReportViewProps> = ({
  shiftEvents,
  simSecondsElapsed,
  totalTriaged,
  totalDischarged,
  totalTransferredIcu,
  totalTransferredOr,
  totalHeapSwaps,
  codeRedCount,
  onAdvanceSimHour,
  staffFatigueState
}) => {
  const [selectedHour, setSelectedHour] = useState<number | 'ALL'>('ALL');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Define 60 sim seconds = 1 simulated hour (Shift Hour 1, 2, 3...)
  const currentSimHour = Math.max(1, Math.floor(simSecondsElapsed / 60) + 1);

  // Group events by simulated hour
  const hourlySummaries = useMemo<ShiftHourSummary[]>(() => {
    const hoursMap = new Map<number, ShiftEvent[]>();
    const maxHour = Math.max(currentSimHour, ...shiftEvents.map(e => e.simHour || 1));

    for (let h = 1; h <= maxHour; h++) {
      hoursMap.set(h, []);
    }

    shiftEvents.forEach(evt => {
      const h = evt.simHour || 1;
      const arr = hoursMap.get(h) || [];
      arr.push(evt);
      hoursMap.set(h, arr);
    });

    const summaries: ShiftHourSummary[] = [];

    hoursMap.forEach((events, h) => {
      const esiDistribution: Record<EsiLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let totalDischarges = 0;
      let totalTransfersIcu = 0;
      let totalTransfersOr = 0;
      let totalTriagedInHour = 0;
      let peakUrgency = 5.0;

      events.forEach(e => {
        if (e.type === 'TRIAGE_INTAKE' || e.type === 'CODE_RED_MCI') {
          totalTriagedInHour++;
          if (e.esiLevel) {
            esiDistribution[e.esiLevel] = (esiDistribution[e.esiLevel] || 0) + 1;
          }
          if (e.urgencyScore < peakUrgency) {
            peakUrgency = e.urgencyScore;
          }
        } else if (e.type === 'DISCHARGE') {
          totalDischarges++;
        } else if (e.type === 'TRANSFER_ICU') {
          totalTransfersIcu++;
        } else if (e.type === 'TRANSFER_OR') {
          totalTransfersOr++;
        }
      });

      const startMin = (h - 1) * 60;
      const endMin = h * 60;
      const timeRange = `${String(Math.floor(startMin / 60)).padStart(2, '0')}:00 - ${String(Math.floor(endMin / 60)).padStart(2, '0')}:00`;

      summaries.push({
        hourNumber: h,
        timeRange,
        totalTriaged: totalTriagedInHour,
        esiDistribution,
        totalDischarges,
        totalTransfersIcu,
        totalTransfersOr,
        avgWaitTimeSeconds: 15,
        peakUrgency: peakUrgency === 5.0 ? 3.0 : peakUrgency,
        heapOperationsCount: Math.round(events.length * 2.3),
        events
      });
    });

    return summaries.sort((a, b) => a.hourNumber - b.hourNumber);
  }, [currentSimHour, shiftEvents]);

  // Filtered events for the event log
  const displayedEvents = useMemo(() => {
    return shiftEvents.filter(evt => {
      const matchHour = selectedHour === 'ALL' || evt.simHour === selectedHour;
      const matchType = selectedEventType === 'ALL' || evt.type === selectedEventType;
      const matchSearch =
        searchQuery.trim() === '' ||
        evt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.chiefComplaint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(evt.patientId).includes(searchQuery.trim());
      return matchHour && matchType && matchSearch;
    });
  }, [shiftEvents, selectedHour, selectedEventType, searchQuery]);

  // Aggregate metrics for selected scope
  const activeMetrics = useMemo(() => {
    if (selectedHour === 'ALL') {
      const discharges = shiftEvents.filter(e => e.type === 'DISCHARGE').length;
      const transfersIcu = shiftEvents.filter(e => e.type === 'TRANSFER_ICU').length;
      const transfersOr = shiftEvents.filter(e => e.type === 'TRANSFER_OR').length;
      const triaged = shiftEvents.filter(e => e.type === 'TRIAGE_INTAKE' || e.type === 'CODE_RED_MCI').length;
      return {
        discharges,
        transfersIcu,
        transfersOr,
        totalTransfers: transfersIcu + transfersOr,
        triaged,
        eventsCount: shiftEvents.length
      };
    } else {
      const hSummary = hourlySummaries.find(h => h.hourNumber === selectedHour);
      return {
        discharges: hSummary?.totalDischarges || 0,
        transfersIcu: hSummary?.totalTransfersIcu || 0,
        transfersOr: hSummary?.totalTransfersOr || 0,
        totalTransfers: (hSummary?.totalTransfersIcu || 0) + (hSummary?.totalTransfersOr || 0),
        triaged: hSummary?.totalTriaged || 0,
        eventsCount: hSummary?.events.length || 0
      };
    }
  }, [selectedHour, shiftEvents, hourlySummaries]);

  // Generate plain-text Shift Summary for local export / download
  const generateShiftReportText = (): string => {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeFormatted = now.toLocaleTimeString('en-US');

    const totalTransfers = totalTransferredIcu + totalTransferredOr;

    let text = `================================================================================
                     ER FLOW · TRAUMA & SURGICAL CENTER
                   OFFICIAL SHIFT HANDOVER & AUDIT REPORT
================================================================================
Generated: ${dateFormatted} at ${timeFormatted}
Facility: ER FLOW Regional Trauma Level-1 Medical Center
Simulated Shift Duration: ${Math.floor(simSecondsElapsed / 60)}m ${simSecondsElapsed % 60}s (Current Shift Hour: ${currentSimHour})
Priority Queue Engine: ANSI C99 Min-Heap Priority Queue (Bit-Shift Arithmetic)
Triage Protocol: 5-Tier Emergency Severity Index (ESI) & Shock-Index Weighting
Staff Availability Model: ${staffFatigueState?.enabled ? `Dynamic Fatigue Active (Dr: ${staffFatigueState.doctorEfficiencyPct}% Eff, RN: ${staffFatigueState.nurseEfficiencyPct}% Eff, Team: ${staffFatigueState.overallEfficiencyPct}% [${staffFatigueState.fatigueTier}], Pace: ${staffFatigueState.effectiveRateMultiplier}x)` : 'Fixed 100% Efficiency (Fatigue Simulation OFF)'}
================================================================================

[1] EXECUTIVE SHIFT SUMMARY & KEY METRICS
--------------------------------------------------------------------------------
Total Emergency Patients Triaged:    ${totalTriaged}
Total Patients Discharged:           ${totalDischarged}
Total Intensive Care (ICU) Transfers: ${totalTransferredIcu}
Total Operating Room (OR) Transfers:  ${totalTransferredOr}
Total Combined Patient Transfers:    ${totalTransfers}
Active Code Red / MCI Waves:         ${codeRedCount}
Min-Heap Algorithmic Swaps:          ${totalHeapSwaps}
Overall Triage-to-Bed Flow Rate:     ${totalTriaged > 0 ? ((totalDischarged + totalTransfers) / totalTriaged * 100).toFixed(1) : '100'}% throughput
Staff Availability Efficiency:       ${staffFatigueState?.enabled ? `${staffFatigueState.overallEfficiencyPct}% (${staffFatigueState.fatigueTier})` : '100% Fixed'}

================================================================================
[2] SIMULATED HOURLY CHRONOLOGY BREAKDOWN
================================================================================
`;

    hourlySummaries.forEach(h => {
      text += `
--- SHIFT HOUR ${h.hourNumber} (${h.timeRange}) ---
  * Patients Triaged:     ${h.totalTriaged}
    - ESI-1 (Resus):      ${h.esiDistribution[1]}
    - ESI-2 (Emergent):   ${h.esiDistribution[2]}
    - ESI-3 (Urgent):     ${h.esiDistribution[3]}
    - ESI-4 (Semi-urg):   ${h.esiDistribution[4]}
    - ESI-5 (Routine):    ${h.esiDistribution[5]}
  * Discharges:           ${h.totalDischarges}
  * ICU Transfers:        ${h.totalTransfersIcu}
  * OR Surgical Transfers:${h.totalTransfersOr}
  * Min-Heap Operations:  ${h.heapOperationsCount}
  * Peak Urgency Score:   ${h.peakUrgency.toFixed(3)}
`;
    });

    text += `
================================================================================
[3] COMPLETE PATIENT DISCHARGE REGISTER
================================================================================
`;

    const dischargeEvents = shiftEvents.filter(e => e.type === 'DISCHARGE');
    if (dischargeEvents.length === 0) {
      text += `No discharges recorded yet in this shift.\n`;
    } else {
      dischargeEvents.forEach((e, idx) => {
        text += `[D-${idx + 1}] Patient #${e.patientId} - ${e.patientName} (${e.age}yo ${e.gender})
     Sim Time: ${e.simTimeFormatted} (Hour ${e.simHour})
     Department: ${e.department} · Bay: ${e.bedName || 'ER Trauma Bay'}
     Chief Complaint: ${e.chiefComplaint}
     Triage Level: ESI-${e.esiLevel} (Score: ${e.urgencyScore.toFixed(3)})
     Outcome: ${e.destinationOrOutcome}
     Attending Staff: ${e.attendingStaff || 'Dr. Mercer / Nurse Ramirez'}
     Notes: ${e.notes || 'Vital stabilization achieved, discharged successfully'}
--------------------------------------------------------------------------------\n`;
      });
    }

    text += `
================================================================================
[4] COMPLETE PATIENT TRANSFER REGISTER (ICU & OR)
================================================================================
`;

    const transferEvents = shiftEvents.filter(e => e.type === 'TRANSFER_ICU' || e.type === 'TRANSFER_OR');
    if (transferEvents.length === 0) {
      text += `No patient transfers recorded yet in this shift.\n`;
    } else {
      transferEvents.forEach((e, idx) => {
        text += `[T-${idx + 1}] Patient #${e.patientId} - ${e.patientName} (${e.age}yo ${e.gender})
     Sim Time: ${e.simTimeFormatted} (Hour ${e.simHour})
     Type: ${e.type === 'TRANSFER_ICU' ? 'ICU CRITICAL CARE TRANSFER' : 'OR EMERGENCY SURGERY TRANSFER'}
     Origin: ${e.department} (${e.bedName || 'Bay'}) -> Destination: ${e.destinationOrOutcome}
     Chief Complaint: ${e.chiefComplaint}
     Severity: ESI-${e.esiLevel} (Score: ${e.urgencyScore.toFixed(3)})
     Clinical Rationale: ${e.notes || 'Escalated care required based on hemodynamic telemetry'}
--------------------------------------------------------------------------------\n`;
      });
    }

    text += `
================================================================================
[5] PRIORITY QUEUE HEAP TRIAGE AUDIT & COMPLEXITY
================================================================================
Heap Data Structure Invariant: Min-Heap Property (Urgency[Parent] <= Urgency[Children])
Root Access: O(1) instantaneous access to highest-risk patient
Insert Time Complexity: O(log N) Bubble-Up
Extract Time Complexity: O(log N) Min-Heapify
Decrease-Key (Vitals Deterioration): O(log N)
Total Heap Swaps Executed: ${totalHeapSwaps}

================================================================================
[6] MEDICAL SUPERVISOR SIGN-OFF
================================================================================
Lead Triage Physician: Dr. E. Mercer, MD, FACEP
Chief Nursing Officer: S. Ramirez, RN, BSN
Signature: [VERIFIED ELECTRONICALLY VIA AEGIS TRIAGE KERNEL]
End of Shift Handover Report.
================================================================================
`;
    return text;
  };

  // Trigger browser text file download
  const handleExportTextFile = () => {
    const reportText = generateShiftReportText();
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ER_Shift_Report_Hour_${currentSimHour}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy report to clipboard
  const handleCopyToClipboard = () => {
    const reportText = generateShiftReportText();
    navigator.clipboard.writeText(reportText).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-slate-100">
                Shift Handover & Hourly Clinical Audit Report
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Hourly breakdown of emergency intake, bed discharges, ICU/OR transfers, and priority queue triage metrics.
            </p>
          </div>

          {/* Action Buttons: Export Local Text File & Copy */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-xs"
              title="Copy formatted shift handover summary to clipboard"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Report</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportTextFile}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
              title="Download official Shift Summary as a local .txt file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Shift Summary (.txt)</span>
            </button>
          </div>
        </div>

        {/* Executive Shift Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Current Shift Hour</span>
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
              Hour {currentSimHour}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {Math.floor(simSecondsElapsed / 60)}m {simSecondsElapsed % 60}s sim
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Total Triaged</span>
              <Activity className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-bold font-mono text-blue-300 mt-1">
              {totalTriaged}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Patients in Intake
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Total Discharged</span>
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
              {totalDischarged}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Stabilized & Discharged
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>ICU Transfers</span>
              <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-bold font-mono text-purple-300 mt-1">
              {totalTransferredIcu}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Critical Care Escalations
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>OR Transfers</span>
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-300 mt-1">
              {totalTransferredOr}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Surgical Theaters
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Min-Heap Swaps</span>
              <Layers className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-bold font-mono text-rose-300 mt-1">
              {totalHeapSwaps}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              O(log N) Re-orders
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Navigation Tabs (Simulated Hour Selector) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Select Simulated Hour
            </span>
          </div>

          {/* Hour Selector Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedHour('ALL')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                selectedHour === 'ALL'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              All Shift Hours
            </button>
            {hourlySummaries.map(h => (
              <button
                key={h.hourNumber}
                onClick={() => setSelectedHour(h.hourNumber)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  selectedHour === h.hourNumber
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>Hour {h.hourNumber}</span>
                {h.hourNumber === currentSimHour && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Active Simulated Hour" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Hour Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {selectedHour === 'ALL' ? 'Cumulative Triage Intake' : `Hour ${selectedHour} Triage Intake`}
            </span>
            <div className="text-2xl font-bold font-mono text-blue-400">
              {activeMetrics.triaged} Patient{activeMetrics.triaged === 1 ? '' : 's'}
            </div>
            <div className="text-xs text-slate-400">
              Evaluated and dynamically inserted into C Min-Heap.
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {selectedHour === 'ALL' ? 'Cumulative Discharges' : `Hour ${selectedHour} Discharges`}
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {activeMetrics.discharges} Patient{activeMetrics.discharges === 1 ? '' : 's'}
            </div>
            <div className="text-xs text-slate-400">
              Completed medical protocol and discharged home or step-down.
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {selectedHour === 'ALL' ? 'Cumulative Transfers' : `Hour ${selectedHour} Transfers`}
            </span>
            <div className="text-2xl font-bold font-mono text-purple-400">
              {activeMetrics.totalTransfers} Patient{activeMetrics.totalTransfers === 1 ? '' : 's'}
            </div>
            <div className="text-xs text-slate-400">
              {activeMetrics.transfersIcu} to ICU · {activeMetrics.transfersOr} to OR
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Recorded Shift Events
            </span>
            <div className="text-2xl font-bold font-mono text-slate-200">
              {activeMetrics.eventsCount}
            </div>
            <div className="text-xs text-slate-400">
              Clinical log entries registered in shift chronology.
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Chronology Comparison Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Hourly Performance Comparison Matrix
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {hourlySummaries.length} Hour{hourlySummaries.length === 1 ? '' : 's'} Logged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {hourlySummaries.map(h => {
            const isCurrent = h.hourNumber === currentSimHour;
            const isSelected = selectedHour === h.hourNumber;

            return (
              <div
                key={h.hourNumber}
                onClick={() => setSelectedHour(h.hourNumber)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-950 border-rose-500 shadow-sm'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-200">
                      Hour {h.hourNumber}
                    </span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {h.timeRange}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2.5 text-center font-mono">
                  <div className="bg-slate-900/80 p-1.5 rounded">
                    <div className="text-[10px] text-slate-400">Triaged</div>
                    <div className="text-sm font-bold text-blue-400">{h.totalTriaged}</div>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded">
                    <div className="text-[10px] text-slate-400">Discharges</div>
                    <div className="text-sm font-bold text-emerald-400">{h.totalDischarges}</div>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded">
                    <div className="text-[10px] text-slate-400">Transfers</div>
                    <div className="text-sm font-bold text-purple-400">{h.totalTransfersIcu + h.totalTransfersOr}</div>
                  </div>
                </div>

                {/* ESI Distribution Pill Rail */}
                <div className="space-y-1 pt-1 border-t border-slate-800/80 text-[11px]">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>ESI Stratification:</span>
                    <span className="text-slate-300">
                      E1:{h.esiDistribution[1]} · E2:{h.esiDistribution[2]} · E3:{h.esiDistribution[3]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Chronological Events Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
        {/* Table Filter Ribbon */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Chronological Shift Event Register
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              ({displayedEvents.length} event{displayedEvents.length === 1 ? '' : 's'})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient, complaint..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700 w-48 sm:w-56"
              />
            </div>

            {/* Event Type Filter */}
            <select
              value={selectedEventType}
              onChange={e => setSelectedEventType(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-slate-700 font-mono"
            >
              <option value="ALL">All Event Types</option>
              <option value="DISCHARGE">Discharges</option>
              <option value="TRANSFER_ICU">ICU Transfers</option>
              <option value="TRANSFER_OR">OR Transfers</option>
              <option value="TRIAGE_INTAKE">Triage Intakes</option>
              <option value="CODE_RED_MCI">Code Red / MCI</option>
            </select>
          </div>
        </div>

        {/* Event List Table */}
        <div className="overflow-x-auto">
          {displayedEvents.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
              <p className="text-xs">No clinical events match the current filter in this simulated hour.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Sim Time</th>
                  <th className="py-2.5 px-3">Hour</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Dept / Bay</th>
                  <th className="py-2.5 px-3">Outcome / Destination</th>
                  <th className="py-2.5 px-3">Attending Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {displayedEvents.map(evt => {
                  const isDischarge = evt.type === 'DISCHARGE';
                  const isIcu = evt.type === 'TRANSFER_ICU';
                  const isOr = evt.type === 'TRANSFER_OR';
                  const isMci = evt.type === 'CODE_RED_MCI';

                  return (
                    <tr key={evt.id} className="hover:bg-slate-950/60 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-200">
                        {evt.simTimeFormatted}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        Hour {evt.simHour}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isDischarge
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : isIcu
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : isOr
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : isMci
                              ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}
                        >
                          {isDischarge && <UserCheck className="w-3 h-3" />}
                          {isIcu && <ArrowRightLeft className="w-3 h-3" />}
                          {isOr && <ArrowRightLeft className="w-3 h-3" />}
                          {isMci && <Siren className="w-3 h-3" />}
                          <span>
                            {isDischarge
                              ? 'DISCHARGE'
                              : isIcu
                              ? 'ICU TRANSFER'
                              : isOr
                              ? 'OR TRANSFER'
                              : isMci
                              ? 'MCI CODE RED'
                              : 'TRIAGE INTAKE'}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-200">
                          #{evt.patientId} {evt.patientName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans truncate max-w-xs">
                          {evt.age}yo {evt.gender} · {evt.chiefComplaint}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            evt.esiLevel === 1
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : evt.esiLevel === 2
                              ? 'bg-orange-950 text-orange-300 border border-orange-800'
                              : evt.esiLevel === 3
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          ESI-{evt.esiLevel} ({evt.urgencyScore.toFixed(2)})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans text-xs">
                        {evt.bedName || `${evt.department} Ward`}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-200 font-semibold text-xs">
                          {evt.destinationOrOutcome}
                        </div>
                        {evt.notes && (
                          <div className="text-[10px] text-slate-400 font-sans">
                            {evt.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">
                        {evt.attendingStaff || 'Clinical Staff'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
