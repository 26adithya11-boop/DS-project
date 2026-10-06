import React from 'react';
import { Play, Pause, StepForward, RotateCcw, Volume2, VolumeX, Sparkles, Activity, Users, Coffee, BatteryCharging } from 'lucide-react';
import { HospitalMetrics, StaffFatigueState } from '../types/hospital';

interface SimulationControlsProps {
  isRunning: boolean;
  onToggleRunning: () => void;
  onStepForward: () => void;
  onReset: () => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  metrics: HospitalMetrics;
  autoArriveEnabled: boolean;
  onToggleAutoArrive: () => void;
  simSecondsElapsed: number;
  onOpenAiRecommendations?: () => void;
  staffFatigueEnabled?: boolean;
  onToggleStaffFatigue?: () => void;
  staffFatigueState?: StaffFatigueState;
  onRestStaffShift?: () => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isRunning,
  onToggleRunning,
  onStepForward,
  onReset,
  speed,
  onChangeSpeed,
  isMuted,
  onToggleMute,
  metrics,
  autoArriveEnabled,
  onToggleAutoArrive,
  simSecondsElapsed,
  onOpenAiRecommendations,
  staffFatigueEnabled = false,
  onToggleStaffFatigue,
  staffFatigueState,
  onRestStaffShift
}) => {
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Simulation Engine Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Play/Pause */}
          <button
            onClick={onToggleRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-xs ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause Sim' : 'Resume Sim'}</span>
          </button>

          {/* Step */}
          <button
            onClick={onStepForward}
            disabled={isRunning}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-medium rounded-md transition-colors"
            title="Advance 1 simulation second"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span>Step</span>
          </button>

          {/* Speed Presets */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-[11px] font-mono">
            {[0.5, 1, 2, 5].map(s => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                className={`px-2 py-1 rounded transition-colors ${
                  speed === s ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Reset */}
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-md transition-colors"
            title="Reset simulation state to defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-md transition-colors"
            title={isMuted ? 'Unmute cardiac telemetry audio' : 'Mute cardiac telemetry audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Audio On'}</span>
          </button>

          {/* Auto Arrive Toggle */}
          <button
            onClick={onToggleAutoArrive}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              autoArriveEnabled
                ? 'bg-blue-950 text-blue-200 border-blue-800'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Auto Trauma Stream: {autoArriveEnabled ? 'Active' : 'Off'}</span>
          </button>

          {/* Staff Availability & Shift Fatigue Toggle */}
          {onToggleStaffFatigue && (
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleStaffFatigue}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                  staffFatigueEnabled
                    ? staffFatigueState?.fatigueTier === 'CRITICAL_FATIGUE'
                      ? 'bg-rose-950/90 text-rose-200 border-rose-600 ring-1 ring-rose-500/50 animate-pulse'
                      : staffFatigueState?.fatigueTier === 'EXHAUSTED'
                      ? 'bg-orange-950/80 text-orange-200 border-orange-600'
                      : staffFatigueState?.fatigueTier === 'TIRED'
                      ? 'bg-amber-950/80 text-amber-200 border-amber-600'
                      : staffFatigueState?.fatigueTier === 'NOMINAL'
                      ? 'bg-sky-950/80 text-sky-200 border-sky-600'
                      : 'bg-teal-950/80 text-teal-200 border-teal-600'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
                title={
                  staffFatigueEnabled && staffFatigueState
                    ? `Doctor Efficiency: ${staffFatigueState.doctorEfficiencyPct}% | Nurse Efficiency: ${staffFatigueState.nurseEfficiencyPct}% | Pace Multiplier: ${staffFatigueState.effectiveRateMultiplier}x. Click to disable fatigue.`
                    : 'Staff Availability is currently fixed at 100% efficiency. Click to simulate doctor and nurse shift fatigue.'
                }
              >
                <Users className={`w-3.5 h-3.5 ${staffFatigueEnabled ? 'text-teal-400' : 'text-slate-400'}`} />
                <span>
                  Staff Availability:{' '}
                  {staffFatigueEnabled && staffFatigueState ? (
                    <span className="font-mono font-semibold">
                      Fatigue Active ({staffFatigueState.overallEfficiencyPct}% Eff)
                    </span>
                  ) : (
                    'Fixed (100%)'
                  )}
                </span>
              </button>

              {/* Rest Shift / Handover button to restore stamina */}
              {staffFatigueEnabled && onRestStaffShift && (
                <button
                  onClick={onRestStaffShift}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-[11px] font-mono flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                  title="Shift rotation break: Restores doctor and nurse stamina to 100%"
                >
                  <Coffee className="w-3 h-3 text-amber-400" />
                  <span className="hidden xl:inline">Rest Shift</span>
                </button>
              )}
            </div>
          )}

          {/* AI Recommendations Action */}
          {onOpenAiRecommendations && (
            <button
              onClick={onOpenAiRecommendations}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-700 via-rose-600 to-amber-600 hover:from-purple-600 hover:to-amber-500 text-white text-xs font-bold rounded-md shadow-xs transition-all cursor-pointer"
              title="Open AI Clinical Operations Advisor to view and execute suggested moves"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>AI Recommendations</span>
            </button>
          )}
        </div>

        {/* Right: Hospital Real-Time Telemetry Counters */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
          {staffFatigueEnabled && staffFatigueState && (
            <>
              <div className="flex items-center gap-1" title={`Doctor: ${staffFatigueState.doctorEfficiencyPct}% · Nurse: ${staffFatigueState.nurseEfficiencyPct}%`}>
                <span className="text-slate-500">STAFF EFF:</span>
                <span className={`font-bold ${
                  staffFatigueState.overallEfficiencyPct < 55
                    ? 'text-rose-400'
                    : staffFatigueState.overallEfficiencyPct < 75
                    ? 'text-amber-400'
                    : 'text-teal-300'
                }`}>
                  {staffFatigueState.overallEfficiencyPct}% ({staffFatigueState.effectiveRateMultiplier}x pace)
                </span>
              </div>
              <span aria-hidden="true" className="text-slate-700">·</span>
            </>
          )}
          <div className="flex items-center gap-1">
            <span className="text-slate-500">SIM CLOCK:</span>
            <span className="text-slate-200 font-bold">{formatTime(simSecondsElapsed)}</span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">TREATED:</span>
            <span className="text-emerald-400 font-bold">{metrics.totalTreated}</span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">CODE REDS:</span>
            <span className="text-rose-400 font-bold">{metrics.codeRedCount}</span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">HEAP SWAPS:</span>
            <span className="text-amber-400 font-bold">{metrics.totalHeapSwaps}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
