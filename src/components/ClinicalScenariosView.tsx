import React from 'react';
import { CLINICAL_PRESETS, ClinicalPreset } from '../engine/clinicalScenarios';
import { PriorityQueueEngine } from '../engine/cEngineSimulator';
import { Patient } from '../types/hospital';
import { HeartPulse, Stethoscope, Scissors, ArrowRight, ShieldAlert, BookOpen } from 'lucide-react';

interface ClinicalScenariosViewProps {
  onInjectPreset: (preset: ClinicalPreset) => void;
}

export const ClinicalScenariosView: React.FC<ClinicalScenariosViewProps> = ({
  onInjectPreset
}) => {
  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-rose-400" />
              <span>Clinical Triage Scenarios & Pathophysiology</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              In high-volume Emergency Departments and Trauma Centers, a traditional First-In-First-Out (FIFO) queue
              would result in catastrophic mortality if a critical patient arrived behind stable patients.
              A Binary Min-Heap Priority Queue guarantees that regardless of intake volume, the most physiologically
              unstable patient is always extracted in <span className="font-mono text-slate-200">O(1)</span> time at the root,
              with insertions and vital adjustments settling in <span className="font-mono text-slate-200">O(log N)</span>.
            </p>
          </div>
        </div>

        {/* Complexity Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800">
          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-500">Peek Next Patient</div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">O(1) Constant</div>
            <div className="text-[11px] text-slate-400 mt-1">Instantaneous inspection of root <code>heap[0]</code></div>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-500">Intake / Insertion</div>
            <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">O(log N) Bubble-Up</div>
            <div className="text-[11px] text-slate-400 mt-1">At most <code>height = ⌊log₂(N)⌋</code> pointer-less swaps</div>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-500">Extract for ER Bay</div>
            <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">O(log N) Heapify</div>
            <div className="text-[11px] text-slate-400 mt-1">Root replaced with leaf and pushed down</div>
          </div>
        </div>
      </div>

      {/* Preset Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CLINICAL_PRESETS.map((preset) => {
          const triage = PriorityQueueEngine.calculateTriageScore(preset.vitals, preset.department);

          return (
            <div
              key={preset.id}
              className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{preset.name}</h3>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {preset.age}y {preset.gender} · {preset.department === 'OR' ? 'Surgical Candidate (OR)' : 'Medical Emergency (ER)'}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-bold text-slate-100">
                      Score: {triage.finalScore.toFixed(3)}
                    </span>
                    <div className={`text-[10px] font-bold mt-0.5 ${
                      triage.esiLevel === 1 ? 'text-rose-400' : triage.esiLevel === 2 ? 'text-amber-400' : 'text-yellow-400'
                    }`}>
                      ESI Level {triage.esiLevel}
                    </div>
                  </div>
                </div>

                {/* Complaint */}
                <div className="mt-3 text-xs text-slate-300">
                  <strong className="text-slate-400 font-normal">Presentation:</strong> {preset.chiefComplaint}
                </div>

                {/* Key Vitals */}
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs font-mono bg-slate-950 p-2 rounded border border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-500">HR</div>
                    <div className="font-bold text-slate-200">{preset.vitals.heartRate} bpm</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">BP</div>
                    <div className="font-bold text-slate-200">{preset.vitals.systolicBp}/{preset.vitals.diastolicBp}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">SpO2</div>
                    <div className="font-bold text-slate-200">{preset.vitals.oxygenSat}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">GCS</div>
                    <div className="font-bold text-slate-200">{preset.vitals.gcs}/15</div>
                  </div>
                </div>

                {/* Clinical Notes */}
                <div className="mt-2 text-[11px] text-slate-400 leading-normal">
                  <strong className="text-slate-300">Rationale:</strong> {triage.clinicalRationale}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  onClick={() => onInjectPreset(preset)}
                  className="w-full py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                >
                  <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                  <span>Admit Scenario into Min-Heap</span>
                  <ArrowRight className="w-3 h-3 ml-auto text-slate-500" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
