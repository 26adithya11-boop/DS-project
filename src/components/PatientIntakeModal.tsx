import React, { useState } from 'react';
import { Patient, Vitals, Department } from '../types/hospital';
import { CLINICAL_PRESETS, ClinicalPreset } from '../engine/clinicalScenarios';
import { PriorityQueueEngine } from '../engine/cEngineSimulator';
import { X, UserPlus, Sparkles, HeartPulse, Stethoscope, Scissors } from 'lucide-react';

interface PatientIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdmitPatient: (patient: Patient) => void;
}

let nextCustomId = 300;

export const PatientIntakeModal: React.FC<PatientIntakeModalProps> = ({
  isOpen,
  onClose,
  onAdmitPatient
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('acute-stemi');
  const [name, setName] = useState<string>('Alex Morgan');
  const [age, setAge] = useState<number>(45);
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('M');
  const [department, setDepartment] = useState<Department>('ER');
  const [chiefComplaint, setChiefComplaint] = useState<string>('Severe acute symptoms');

  // Custom vitals
  const [vitals, setVitals] = useState<Vitals>({
    heartRate: 110,
    systolicBp: 95,
    diastolicBp: 65,
    oxygenSat: 92,
    respRate: 24,
    temperature: 37.2,
    gcs: 14,
    painScore: 8,
    injurySeverity: 12
  });

  if (!isOpen) return null;

  const handleApplyPreset = (preset: ClinicalPreset) => {
    setSelectedPresetId(preset.id);
    setName(preset.name);
    setAge(preset.age);
    setGender(preset.gender);
    setDepartment(preset.department);
    setChiefComplaint(preset.chiefComplaint);
    setVitals({ ...preset.vitals });
  };

  const previewTriage = PriorityQueueEngine.calculateTriageScore(vitals, department);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newPatient: Patient = {
      id: ++nextCustomId,
      name: name.trim() || 'Emergency Patient',
      age,
      gender,
      department,
      chiefComplaint: chiefComplaint.trim() || 'Acute medical triage evaluation',
      vitals: { ...vitals },
      calculatedUrgency: previewTriage.finalScore,
      esiLevel: previewTriage.esiLevel,
      arrivalTime: Date.now(),
      waitTimeSeconds: 0,
      notes: previewTriage.clinicalRationale,
      deteriorationStatus: previewTriage.esiLevel === 1 ? 'CRITICAL_ARREST' : 'STABLE',
      ecgRhythm: vitals.heartRate > 140 ? 'SINUS_TACHY' : vitals.heartRate < 50 ? 'SINUS_BRADY' : 'NSR',
      vitalsHistory: [
        {
          timestamp: Date.now(),
          simTimeFormatted: 'T-00:00',
          heartRate: vitals.heartRate,
          systolicBp: vitals.systolicBp,
          diastolicBp: vitals.diastolicBp,
          oxygenSat: vitals.oxygenSat,
          respRate: vitals.respRate,
          calculatedUrgency: previewTriage.finalScore
        }
      ]
    };

    onAdmitPatient(newPatient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-rose-500" />
            <div>
              <h3 className="text-base font-bold text-white">Emergency Patient Intake & Triage</h3>
              <p className="text-xs text-slate-400">Configure clinical vitals to calculate Priority Queue Min-Heap key</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5">
          {/* Presets Bar */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Clinical Case Presets
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {CLINICAL_PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors border ${
                    selectedPresetId === p.id
                      ? 'bg-rose-950/80 text-rose-200 border-rose-500 shadow-xs'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {p.name.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Demographic & Dept */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Patient Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Age & Gender</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="115"
                  value={age}
                  onChange={e => setAge(parseInt(e.target.value) || 30)}
                  className="w-20 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as 'M' | 'F' | 'O')}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                  <option value="O">Other (O)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Routing Department</label>
              <div className="flex gap-1.5 bg-slate-950 p-1 rounded border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDepartment('ER')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs font-semibold transition-colors ${
                    department === 'ER' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>ER Bays</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDepartment('OR')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs font-semibold transition-colors ${
                    department === 'OR' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>OR Theater</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Chief Complaint / Trauma Mechanism</label>
            <input
              type="text"
              value={chiefComplaint}
              onChange={e => setChiefComplaint(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Interactive Vital Sliders */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Vitals & Trauma Indicators
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* HR */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Heart Rate</span>
                  <span className="font-mono font-bold text-rose-400">{vitals.heartRate} bpm</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="210"
                  value={vitals.heartRate}
                  onChange={e => setVitals({ ...vitals, heartRate: parseInt(e.target.value) })}
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Systolic BP */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Systolic BP</span>
                  <span className="font-mono font-bold text-amber-400">{vitals.systolicBp} mmHg</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="230"
                  value={vitals.systolicBp}
                  onChange={e => setVitals({ ...vitals, systolicBp: parseInt(e.target.value) })}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* SpO2 */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Oxygen SpO2</span>
                  <span className="font-mono font-bold text-sky-400">{vitals.oxygenSat}%</span>
                </div>
                <input
                  type="range"
                  min="65"
                  max="100"
                  value={vitals.oxygenSat}
                  onChange={e => setVitals({ ...vitals, oxygenSat: parseInt(e.target.value) })}
                  className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Resp Rate */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Resp Rate</span>
                  <span className="font-mono font-bold text-indigo-400">{vitals.respRate} /min</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="50"
                  value={vitals.respRate}
                  onChange={e => setVitals({ ...vitals, respRate: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* GCS */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>GCS Coma</span>
                  <span className="font-mono font-bold text-purple-400">{vitals.gcs} / 15</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="15"
                  value={vitals.gcs}
                  onChange={e => setVitals({ ...vitals, gcs: parseInt(e.target.value) })}
                  className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Pain */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Pain Scale</span>
                  <span className="font-mono font-bold text-yellow-400">{vitals.painScore} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={vitals.painScore}
                  onChange={e => setVitals({ ...vitals, painScore: parseInt(e.target.value) })}
                  className="w-full accent-yellow-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* ISS */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Trauma ISS</span>
                  <span className="font-mono font-bold text-rose-400">{vitals.injurySeverity} ISS</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="75"
                  value={vitals.injurySeverity}
                  onChange={e => setVitals({ ...vitals, injurySeverity: parseInt(e.target.value) })}
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Temperature */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Temperature</span>
                  <span className="font-mono font-bold text-orange-400">{vitals.temperature}°C</span>
                </div>
                <input
                  type="range"
                  min="34.0"
                  max="41.5"
                  step="0.1"
                  value={vitals.temperature}
                  onChange={e => setVitals({ ...vitals, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-orange-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Live Calculated Triage Card */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">Computed Urgency Score:</span>
                <span className="font-mono font-bold text-rose-400 text-sm">
                  {previewTriage.finalScore.toFixed(3)}
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-bold bg-rose-950 text-rose-200 border border-rose-800">
                  ESI Level {previewTriage.esiLevel}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {previewTriage.clinicalRationale}
              </div>
            </div>

            <div className="text-right text-xs font-mono text-slate-500 hidden sm:block">
              <div>Algorithm: ESI v4 + MEWS</div>
              <div>Min-Heap Root Target &lt; 2.0</div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-md transition-colors shadow-xs flex items-center gap-1.5"
            >
              <HeartPulse className="w-4 h-4" />
              <span>Admit Patient & Insert to Min-Heap</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
