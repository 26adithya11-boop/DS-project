import React, { useState } from 'react';
import { Patient, Vitals, VitalHistoryPoint } from '../types/hospital';
import { PriorityQueueEngine } from '../engine/cEngineSimulator';
import { X, Heart, Wind, Thermometer, Brain, AlertOctagon, Activity, Volume2, VolumeX, ShieldAlert, CheckCircle, ArrowUpCircle, LineChart as ChartIcon } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { EcgMonitor } from './EcgMonitor';
import { soundEngine } from '../utils/audioEngine';

interface PatientDetailModalProps {
  patient: Patient | null;
  onClose: () => void;
  onUpdateVitals: (patientId: number, newVitals: Vitals) => void;
  onDirectAdmit?: (patientId: number) => void;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({
  patient,
  onClose,
  onUpdateVitals,
  onDirectAdmit
}) => {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [vitalsFilter, setVitalsFilter] = useState<'ALL' | 'HR' | 'BP'>('ALL');

  if (!patient) return null;

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.setMuted(!next);
  };

  const triageBreakdown = PriorityQueueEngine.calculateTriageScore(patient.vitals, patient.department);

  // Trigger simulated sudden acute shock / vital collapse
  const handleSimulateShock = () => {
    const crashedVitals: Vitals = {
      ...patient.vitals,
      heartRate: Math.min(190, patient.vitals.heartRate + 45),
      systolicBp: Math.max(55, patient.vitals.systolicBp - 40),
      diastolicBp: Math.max(35, patient.vitals.diastolicBp - 25),
      oxygenSat: Math.max(76, patient.vitals.oxygenSat - 14),
      respRate: Math.min(42, patient.vitals.respRate + 12),
      gcs: Math.max(4, patient.vitals.gcs - 4),
      injurySeverity: Math.min(50, patient.vitals.injurySeverity + 10)
    };
    soundEngine.playCodeRed();
    onUpdateVitals(patient.id, crashedVitals);
  };

  // Trigger simulated resuscitation stabilization
  const handleStabilize = () => {
    const stabilizedVitals: Vitals = {
      ...patient.vitals,
      heartRate: 78,
      systolicBp: 118,
      diastolicBp: 76,
      oxygenSat: 99,
      respRate: 15,
      temperature: 36.8,
      gcs: 15,
      painScore: Math.max(1, patient.vitals.painScore - 4)
    };
    onUpdateVitals(patient.id, stabilizedVitals);
  };

  // Safe vitals history data for Recharts
  const historyData: VitalHistoryPoint[] =
    patient.vitalsHistory && patient.vitalsHistory.length > 0
      ? patient.vitalsHistory
      : [
          {
            timestamp: Date.now(),
            simTimeFormatted: 'T-00:00',
            heartRate: patient.vitals.heartRate,
            systolicBp: patient.vitals.systolicBp,
            diastolicBp: patient.vitals.diastolicBp,
            oxygenSat: patient.vitals.oxygenSat,
            respRate: patient.vitals.respRate,
            calculatedUrgency: patient.calculatedUrgency
          }
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              patient.esiLevel === 1 ? 'bg-rose-500 animate-ping' : patient.esiLevel === 2 ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Patient #{patient.id} · {patient.name}
                </h3>
                <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded ${
                  patient.department === 'OR' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-blue-950 text-blue-300 border border-blue-800'
                }`}>
                  {patient.department} Route
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {patient.age}y {patient.gender} · {patient.chiefComplaint}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Real-time ECG Banner */}
          <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Continuous Cardiac Rhythm & Telemetry</span>
              </span>
              <button
                onClick={toggleSound}
                className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900 border border-slate-800"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{soundEnabled ? 'Mute Telemetry' : 'Unmute Telemetry'}</span>
              </button>
            </div>
            <EcgMonitor
              heartRate={patient.vitals.heartRate}
              spo2={patient.vitals.oxygenSat}
              rhythm={patient.ecgRhythm}
              height={70}
              enableSound={soundEnabled}
            />
          </div>

          {/* Vitals Grid */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Physiological Vital Signs
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span>Heart Rate</span>
                </div>
                <div className="text-xl font-bold font-mono text-slate-100 mt-1">
                  {patient.vitals.heartRate} <span className="text-[10px] text-slate-500 font-normal">bpm</span>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>Blood Pressure</span>
                </div>
                <div className="text-xl font-bold font-mono text-slate-100 mt-1">
                  {patient.vitals.systolicBp}/{patient.vitals.diastolicBp} <span className="text-[10px] text-slate-500 font-normal">mmHg</span>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Wind className="w-3.5 h-3.5 text-sky-400" />
                  <span>SpO2 Oxygen</span>
                </div>
                <div className="text-xl font-bold font-mono text-slate-100 mt-1">
                  {patient.vitals.oxygenSat} <span className="text-[10px] text-slate-500 font-normal">%</span>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Wind className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Resp Rate</span>
                </div>
                <div className="text-xl font-bold font-mono text-slate-100 mt-1">
                  {patient.vitals.respRate} <span className="text-[10px] text-slate-500 font-normal">/min</span>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                  <span>Temperature</span>
                </div>
                <div className="text-xl font-bold font-mono text-slate-100 mt-1">
                  {patient.vitals.temperature.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">°C</span>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                  <span>GCS Coma Scale</span>
                </div>
                <div className="text-xl font-bold font-mono text-slate-100 mt-1">
                  {patient.vitals.gcs} <span className="text-[10px] text-slate-500 font-normal">/ 15</span>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <AlertOctagon className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Pain Score</span>
                </div>
                <div className="text-xl font-bold font-mono text-slate-100 mt-1">
                  {patient.vitals.painScore} <span className="text-[10px] text-slate-500 font-normal">/ 10</span>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Trauma ISS</span>
                </div>
                <div className="text-xl font-bold font-mono text-slate-100 mt-1">
                  {patient.vitals.injurySeverity} <span className="text-[10px] text-slate-500 font-normal">ISS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recharts Vitals History Line Chart */}
          <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ChartIcon className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Vitals Trajectory & Time Series History
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  ({historyData.length} points)
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-800 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setVitalsFilter('ALL')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    vitalsFilter === 'ALL' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All (HR & BP)
                </button>
                <button
                  type="button"
                  onClick={() => setVitalsFilter('HR')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    vitalsFilter === 'HR' ? 'bg-rose-950 text-rose-300 font-bold border border-rose-800' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  HR Only
                </button>
                <button
                  type="button"
                  onClick={() => setVitalsFilter('BP')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    vitalsFilter === 'BP' ? 'bg-amber-950 text-amber-300 font-bold border border-amber-800' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  BP Only
                </button>
              </div>
            </div>

            {/* Recharts Container */}
            <div className="w-full h-52 text-xs font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="simTimeFormatted"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={{ stroke: '#334155' }}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={{ stroke: '#334155' }}
                    axisLine={{ stroke: '#334155' }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as VitalHistoryPoint;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-xl text-[11px] font-mono space-y-1">
                            <div className="text-slate-400 font-bold border-b border-slate-800 pb-1">
                              Time: {label || data.simTimeFormatted}
                            </div>
                            <div className="text-rose-400 flex justify-between gap-3">
                              <span>Heart Rate:</span>
                              <span className="font-bold">{data.heartRate} bpm</span>
                            </div>
                            <div className="text-amber-400 flex justify-between gap-3">
                              <span>Systolic BP:</span>
                              <span className="font-bold">{data.systolicBp} mmHg</span>
                            </div>
                            <div className="text-sky-400 flex justify-between gap-3">
                              <span>Diastolic BP:</span>
                              <span className="font-bold">{data.diastolicBp} mmHg</span>
                            </div>
                            <div className="text-slate-400 flex justify-between gap-3 border-t border-slate-800 pt-1">
                              <span>SpO2:</span>
                              <span>{data.oxygenSat}%</span>
                            </div>
                            <div className="text-emerald-400 flex justify-between gap-3">
                              <span>Urgency Key:</span>
                              <span>{data.calculatedUrgency.toFixed(3)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={26}
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '4px' }}
                  />
                  {(vitalsFilter === 'ALL' || vitalsFilter === 'HR') && (
                    <Line
                      type="monotone"
                      name="Heart Rate (bpm)"
                      dataKey="heartRate"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: '#f43f5e' }}
                      activeDot={{ r: 5, fill: '#fb7185' }}
                      isAnimationActive={false}
                    />
                  )}
                  {(vitalsFilter === 'ALL' || vitalsFilter === 'BP') && (
                    <Line
                      type="monotone"
                      name="Systolic BP (mmHg)"
                      dataKey="systolicBp"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: '#f59e0b' }}
                      activeDot={{ r: 5, fill: '#fcd34d' }}
                      isAnimationActive={false}
                    />
                  )}
                  {(vitalsFilter === 'ALL' || vitalsFilter === 'BP') && (
                    <Line
                      type="monotone"
                      name="Diastolic BP (mmHg)"
                      dataKey="diastolicBp"
                      stroke="#38bdf8"
                      strokeWidth={1.8}
                      strokeDasharray="4 4"
                      dot={{ r: 2, fill: '#38bdf8' }}
                      activeDot={{ r: 4.5, fill: '#7dd3fc' }}
                      isAnimationActive={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mathematical Triage Formula Breakdown */}
          <div className="bg-slate-950/80 rounded-lg p-3.5 border border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-200">
                C Engine Urgency Derivation Formula
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-rose-400">
                  Score: {patient.calculatedUrgency.toFixed(3)}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  ESI Level {patient.esiLevel}
                </span>
              </div>
            </div>

            <div className="mt-2.5 text-xs text-slate-400 space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span>Base Normal Homeostasis:</span>
                <span className="text-slate-200">5.000</span>
              </div>
              {triageBreakdown.bpPenalty > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>- Hemodynamic / BP shock penalty:</span>
                  <span>-{triageBreakdown.bpPenalty.toFixed(2)}</span>
                </div>
              )}
              {triageBreakdown.spo2Penalty > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>- Hypoxia (SpO2 &lt; 93%) penalty:</span>
                  <span>-{triageBreakdown.spo2Penalty.toFixed(2)}</span>
                </div>
              )}
              {triageBreakdown.hrPenalty > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>- Arrhythmia / HR extreme penalty:</span>
                  <span>-{triageBreakdown.hrPenalty.toFixed(2)}</span>
                </div>
              )}
              {triageBreakdown.respPenalty > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>- Respiratory distress penalty:</span>
                  <span>-{triageBreakdown.respPenalty.toFixed(2)}</span>
                </div>
              )}
              {triageBreakdown.gcsPenalty > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>- Coma / Neurological (GCS) penalty:</span>
                  <span>-{triageBreakdown.gcsPenalty.toFixed(2)}</span>
                </div>
              )}
              {triageBreakdown.issPenalty > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>- Anatomical Trauma ISS penalty:</span>
                  <span>-{triageBreakdown.issPenalty.toFixed(2)}</span>
                </div>
              )}
              {triageBreakdown.departmentAdjustment > 0 && (
                <div className="flex justify-between text-purple-400">
                  <span>- Surgical suite (OR) priority boost:</span>
                  <span>-{triageBreakdown.departmentAdjustment.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-slate-200 text-xs">
                <span>= Final Clamped Priority Key:</span>
                <span className="text-emerald-400">{patient.calculatedUrgency.toFixed(3)} (Min-Heap Key)</span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <strong className="text-slate-300">Rationale:</strong> {triageBreakdown.clinicalRationale}
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Interactive Clinical Simulation Actions
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleSimulateShock}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-rose-950/70 border border-rose-700/80 hover:bg-rose-900 text-rose-200 text-xs font-semibold transition-colors"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Simulate Vital Crash (Code Red)</span>
              </button>

              <button
                onClick={handleStabilize}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-950/70 border border-emerald-700/80 hover:bg-emerald-900 text-emerald-200 text-xs font-semibold transition-colors"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Administer Resus & Stabilize</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Heap Index: {patient.heapIndex !== undefined ? `heap[${patient.heapIndex}]` : 'In Bed'}
          </span>

          <div className="flex items-center gap-2">
            {onDirectAdmit && (
              <button
                onClick={() => onDirectAdmit(patient.id)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                <span>Admit to Bed</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
