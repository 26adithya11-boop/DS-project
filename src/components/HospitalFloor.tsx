import React from 'react';
import { BedSlot, Patient, StaffFatigueState } from '../types/hospital';
import { Stethoscope, Scissors, UserCheck, AlertTriangle, PlayCircle, CheckCircle2, Users } from 'lucide-react';
import { EcgMonitor } from './EcgMonitor';

interface HospitalFloorProps {
  beds: BedSlot[];
  onDischargeBed: (bedId: string, outcomeType?: 'DISCHARGE' | 'TRANSFER_ICU' | 'TRANSFER_OR') => void;
  onAdmitPatientToBed: (bedId: string) => void;
  onSelectPatient: (patient: Patient) => void;
  hasWaitingPatients: boolean;
  nextPatientInQueue: Patient | null;
  staffFatigueState?: StaffFatigueState;
}

export const HospitalFloor: React.FC<HospitalFloorProps> = ({
  beds,
  onDischargeBed,
  onAdmitPatientToBed,
  onSelectPatient,
  hasWaitingPatients,
  nextPatientInQueue,
  staffFatigueState
}) => {
  const erBeds = beds.filter(b => b.department === 'ER');
  const orBeds = beds.filter(b => b.department === 'OR');

  return (
    <div className="space-y-6">
      {/* ER Emergency Department Floor */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-semibold text-slate-100">
              Emergency Department (ER) · Trauma & Resuscitation
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {staffFatigueState?.enabled && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
                  staffFatigueState.overallEfficiencyPct < 55
                    ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse'
                    : staffFatigueState.overallEfficiencyPct < 75
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-teal-950 text-teal-300 border border-teal-800'
                }`}
                title={`Doctor Efficiency: ${staffFatigueState.doctorEfficiencyPct}% · Nurse Efficiency: ${staffFatigueState.nurseEfficiencyPct}%`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Shift Pace: {staffFatigueState.overallEfficiencyPct}% ({staffFatigueState.fatigueTier})</span>
              </span>
            )}
            <div className="text-xs text-slate-400">
              {erBeds.filter(b => b.patient !== null).length} / {erBeds.length} Bays Occupied
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {erBeds.map(bed => {
            const isOccupied = bed.patient !== null;
            const patient = bed.patient;
            const progress = isOccupied
              ? Math.min(100, Math.round((bed.treatmentElapsedSeconds / bed.treatmentTotalDuration) * 100))
              : 0;
            const isReadyForDischarge = isOccupied && bed.treatmentElapsedSeconds >= bed.treatmentTotalDuration;

            return (
              <div
                key={bed.id}
                className={`flex flex-col justify-between rounded-lg border p-3.5 transition-all ${
                  isOccupied
                    ? patient?.esiLevel === 1
                      ? 'bg-rose-950/40 border-rose-600/60'
                      : 'bg-slate-950/70 border-slate-800'
                    : 'bg-slate-950/30 border-dashed border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Bed Header */}
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
                    <span className="font-semibold text-slate-200">{bed.name}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                        isOccupied
                          ? isReadyForDischarge
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-blue-950 text-blue-300 border border-blue-700'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isOccupied ? (isReadyForDischarge ? 'STABILIZED' : 'ACTIVE CARE') : 'EMPTY'}
                    </span>
                  </div>

                  {/* Staff Info */}
                  <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-300 truncate">{bed.assignedStaff.doctor}</span>
                      {staffFatigueState?.enabled && (
                        <span
                          className={`text-[10px] font-mono shrink-0 ml-1 ${
                            staffFatigueState.doctorEfficiencyPct < 55
                              ? 'text-rose-400'
                              : staffFatigueState.doctorEfficiencyPct < 75
                              ? 'text-amber-400'
                              : 'text-teal-300'
                          }`}
                          title={`Doctor fatigue: ${staffFatigueState.doctorEfficiencyPct}% operational stamina`}
                        >
                          {staffFatigueState.doctorEfficiencyPct}% eff
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 truncate">{bed.assignedStaff.nurse}</span>
                      {staffFatigueState?.enabled && (
                        <span
                          className={`text-[10px] font-mono shrink-0 ml-1 ${
                            staffFatigueState.nurseEfficiencyPct < 55
                              ? 'text-rose-400'
                              : staffFatigueState.nurseEfficiencyPct < 75
                              ? 'text-amber-400'
                              : 'text-teal-300'
                          }`}
                          title={`Nurse fatigue: ${staffFatigueState.nurseEfficiencyPct}% operational stamina`}
                        >
                          {staffFatigueState.nurseEfficiencyPct}% eff
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Patient Info or Empty State */}
                  {isOccupied && patient ? (
                    <div className="mt-3">
                      <div
                        onClick={() => onSelectPatient(patient)}
                        className="cursor-pointer group p-2 rounded bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-100 group-hover:text-blue-300 transition-colors truncate">
                            #{patient.id} {patient.name}
                          </span>
                          <span className="font-mono text-[10px] text-rose-400 font-bold shrink-0">
                            ESI-{patient.esiLevel}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {patient.chiefComplaint}
                        </div>

                        {/* Mini ECG Strip */}
                        <div className="mt-2">
                          <EcgMonitor
                            heartRate={patient.vitals.heartRate}
                            spo2={patient.vitals.oxygenSat}
                            rhythm={patient.ecgRhythm}
                            height={44}
                          />
                        </div>
                      </div>

                      {/* Treatment Progress */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span className="flex items-center gap-1.5">
                            <span>Treatment Course</span>
                            {staffFatigueState?.enabled && (
                              <span
                                className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                                  staffFatigueState.overallEfficiencyPct < 55
                                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                    : staffFatigueState.overallEfficiencyPct < 75
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-teal-950 text-teal-300 border border-teal-800'
                                }`}
                                title={`Bed treatment progress pace: ${staffFatigueState.effectiveRateMultiplier}x (${staffFatigueState.overallEfficiencyPct}% team efficiency)`}
                              >
                                {staffFatigueState.effectiveRateMultiplier}x pace
                              </span>
                            )}
                          </span>
                          <span>
                            {Math.min(bed.treatmentTotalDuration, Math.round(bed.treatmentElapsedSeconds))}s / {bed.treatmentTotalDuration}s
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isReadyForDischarge ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="my-6 text-center text-slate-500">
                      <p className="text-xs">Bay Ready for Patient</p>
                      {nextPatientInQueue && nextPatientInQueue.department === 'ER' && (
                        <p className="text-[11px] text-blue-400/80 mt-1">
                          Next in Queue: #{nextPatientInQueue.id}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bed Action Footer */}
                <div className="mt-4 pt-2 border-t border-slate-800/80">
                  {isOccupied ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => onDischargeBed(bed.id, 'DISCHARGE')}
                        className={`py-1.5 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                          isReadyForDischarge
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                        title="Discharge patient home or step-down ambulatory care"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isReadyForDischarge ? 'Discharge' : 'Fast-Track'}</span>
                      </button>

                      <button
                        onClick={() => onDischargeBed(bed.id, 'TRANSFER_ICU')}
                        className="py-1.5 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1 bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-800 transition-colors"
                        title="Escalate patient to Intensive Care Unit (ICU)"
                      >
                        <UserCheck className="w-3 h-3 text-purple-300" />
                        <span>Transfer ICU</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onAdmitPatientToBed(bed.id)}
                      disabled={!hasWaitingPatients}
                      className="w-full py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white transition-colors"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Admit from Heap</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OR Surgical Suites Floor */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-semibold text-slate-100">
              Operating Rooms (OR) · Surgical Suites
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {staffFatigueState?.enabled && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
                  staffFatigueState.overallEfficiencyPct < 55
                    ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse'
                    : staffFatigueState.overallEfficiencyPct < 75
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-teal-950 text-teal-300 border border-teal-800'
                }`}
                title={`Surgical Team Stamina: ${staffFatigueState.overallEfficiencyPct}%`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Surgical Pace: {staffFatigueState.effectiveRateMultiplier}x ({staffFatigueState.overallEfficiencyPct}%)</span>
              </span>
            )}
            <div className="text-xs text-slate-400">
              {orBeds.filter(b => b.patient !== null).length} / {orBeds.length} Theaters Active
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {orBeds.map(bed => {
            const isOccupied = bed.patient !== null;
            const patient = bed.patient;
            const progress = isOccupied
              ? Math.min(100, Math.round((bed.treatmentElapsedSeconds / bed.treatmentTotalDuration) * 100))
              : 0;
            const isReadyForDischarge = isOccupied && bed.treatmentElapsedSeconds >= bed.treatmentTotalDuration;

            return (
              <div
                key={bed.id}
                className={`flex flex-col justify-between rounded-lg border p-4 transition-all ${
                  isOccupied
                    ? 'bg-purple-950/30 border-purple-800/60'
                    : 'bg-slate-950/30 border-dashed border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
                    <span className="font-semibold text-slate-200">{bed.name}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                        isOccupied
                          ? isReadyForDischarge
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-purple-950 text-purple-300 border border-purple-700'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isOccupied ? (isReadyForDischarge ? 'POST-OP RECOVERY' : 'IN SURGERY') : 'THEATER READY'}
                    </span>
                  </div>

                  {/* Staff Info */}
                  <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-300 truncate">{bed.assignedStaff.doctor}</span>
                      {staffFatigueState?.enabled && (
                        <span
                          className={`text-[10px] font-mono shrink-0 ml-1 ${
                            staffFatigueState.doctorEfficiencyPct < 55
                              ? 'text-rose-400'
                              : staffFatigueState.doctorEfficiencyPct < 75
                              ? 'text-amber-400'
                              : 'text-teal-300'
                          }`}
                        >
                          {staffFatigueState.doctorEfficiencyPct}% eff
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 truncate">{bed.assignedStaff.nurse}</span>
                      {staffFatigueState?.enabled && (
                        <span
                          className={`text-[10px] font-mono shrink-0 ml-1 ${
                            staffFatigueState.nurseEfficiencyPct < 55
                              ? 'text-rose-400'
                              : staffFatigueState.nurseEfficiencyPct < 75
                              ? 'text-amber-400'
                              : 'text-teal-300'
                          }`}
                        >
                          {staffFatigueState.nurseEfficiencyPct}% eff
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Patient Info or Empty State */}
                  {isOccupied && patient ? (
                    <div className="mt-3">
                      <div
                        onClick={() => onSelectPatient(patient)}
                        className="cursor-pointer group p-2.5 rounded bg-slate-900/90 border border-slate-800 hover:border-purple-800/80 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-100 group-hover:text-purple-300 transition-colors truncate">
                            #{patient.id} {patient.name}
                          </span>
                          <span className="font-mono text-[10px] text-purple-400 font-bold shrink-0">
                            ESI-{patient.esiLevel}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {patient.chiefComplaint}
                        </div>

                        {/* Mini ECG */}
                        <div className="mt-2">
                          <EcgMonitor
                            heartRate={patient.vitals.heartRate}
                            spo2={patient.vitals.oxygenSat}
                            rhythm={patient.ecgRhythm}
                            height={44}
                          />
                        </div>
                      </div>

                      {/* Surgical Progress */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span className="flex items-center gap-1.5">
                            <span>Surgical Operation</span>
                            {staffFatigueState?.enabled && (
                              <span
                                className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                                  staffFatigueState.overallEfficiencyPct < 55
                                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                    : staffFatigueState.overallEfficiencyPct < 75
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-teal-950 text-teal-300 border border-teal-800'
                                }`}
                              >
                                {staffFatigueState.effectiveRateMultiplier}x pace
                              </span>
                            )}
                          </span>
                          <span>
                            {Math.min(bed.treatmentTotalDuration, Math.round(bed.treatmentElapsedSeconds))}s / {bed.treatmentTotalDuration}s
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isReadyForDischarge ? 'bg-emerald-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="my-8 text-center text-slate-500">
                      <p className="text-xs">Surgical Suite Sanitized & Available</p>
                      {nextPatientInQueue && nextPatientInQueue.department === 'OR' && (
                        <p className="text-[11px] text-purple-400/80 mt-1">
                          Next in Queue: #{nextPatientInQueue.id}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-2 border-t border-slate-800/80">
                  {isOccupied ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => onDischargeBed(bed.id, 'DISCHARGE')}
                        className={`py-1.5 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                          isReadyForDischarge
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                        title="Complete surgery and discharge or transfer to PACU"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isReadyForDischarge ? 'Post-Op PACU' : 'Close Early'}</span>
                      </button>

                      <button
                        onClick={() => onDischargeBed(bed.id, 'TRANSFER_ICU')}
                        className="py-1.5 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1 bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-800 transition-colors"
                        title="Transfer patient to Surgical Intensive Care Unit (SICU)"
                      >
                        <UserCheck className="w-3 h-3 text-purple-300" />
                        <span>Transfer SICU</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onAdmitPatientToBed(bed.id)}
                      disabled={!hasWaitingPatients}
                      className="w-full py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:hover:bg-purple-600 text-white transition-colors"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Admit Next Patient</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
