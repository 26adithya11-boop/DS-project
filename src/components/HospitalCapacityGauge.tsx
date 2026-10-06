import React from 'react';
import { BedSlot, Patient, StaffFatigueState } from '../types/hospital';
import { Bed, Clock, AlertTriangle, CheckCircle, TrendingUp, UserCheck, ArrowRight, Activity, ShieldAlert, Sparkles, Users } from 'lucide-react';

interface HospitalCapacityGaugeProps {
  beds: BedSlot[];
  queue: Patient[];
  onDischargeAllStabilized?: () => void;
  onAdmitRootToAvailable?: () => void;
  onOpenAiRecommendations?: () => void;
  staffFatigueState?: StaffFatigueState;
}

export const HospitalCapacityGauge: React.FC<HospitalCapacityGaugeProps> = ({
  beds,
  queue,
  onDischargeAllStabilized,
  onAdmitRootToAvailable,
  onOpenAiRecommendations,
  staffFatigueState
}) => {
  const [viewMode, setViewMode] = React.useState<'combined' | 'gauges' | 'progress-bars'>('combined');

  // 1. Bed Occupancy Calculations
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter(b => b.patient !== null).length;
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const erBeds = beds.filter(b => b.department === 'ER');
  const erOccupied = erBeds.filter(b => b.patient !== null).length;
  const erPct = erBeds.length > 0 ? Math.round((erOccupied / erBeds.length) * 100) : 0;

  const orBeds = beds.filter(b => b.department === 'OR');
  const orOccupied = orBeds.filter(b => b.patient !== null).length;
  const orPct = orBeds.length > 0 ? Math.round((orOccupied / orBeds.length) * 100) : 0;

  const stabilizedCount = beds.filter(
    b => b.patient !== null && b.treatmentElapsedSeconds >= b.treatmentTotalDuration
  ).length;

  // 2. Average Wait Time Calculations
  const avgWaitTimeSec =
    queue.length > 0
      ? Math.round(queue.reduce((acc, p) => acc + (p.waitTimeSeconds || 0), 0) / queue.length)
      : 0;

  const maxWaitTimeSec =
    queue.length > 0 ? Math.max(...queue.map(p => p.waitTimeSeconds || 0)) : 0;

  // Wait time benchmark scale (target <= 20s, max benchmark 90s for 100% scale)
  const waitTimeGaugePct = Math.min(100, Math.round((avgWaitTimeSec / 90) * 100));

  // Critical patients waiting (ESI 1 or 2)
  const highRiskWaiting = queue.filter(p => p.calculatedUrgency < 2.8).length;

  // Format time (MM:SS or Xs)
  const formatTime = (totalSec: number) => {
    if (totalSec < 60) return `${totalSec}s`;
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Color theme for Bed Occupancy
  const getOccupancyColor = (pct: number) => {
    if (pct >= 86) return { stroke: '#ef4444', text: 'text-rose-400', bg: 'bg-rose-950/60', border: 'border-rose-700', barBg: 'bg-rose-500' };
    if (pct >= 65) return { stroke: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-950/60', border: 'border-amber-700', barBg: 'bg-amber-500' };
    return { stroke: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-950/60', border: 'border-emerald-700', barBg: 'bg-emerald-500' };
  };

  // Color theme for Wait Time
  const getWaitTimeColor = (sec: number) => {
    if (sec >= 45) return { stroke: '#ef4444', text: 'text-rose-400', bg: 'bg-rose-950/60', border: 'border-rose-700', barBg: 'bg-rose-500' };
    if (sec >= 20) return { stroke: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-950/60', border: 'border-amber-700', barBg: 'bg-amber-500' };
    return { stroke: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-950/60', border: 'border-emerald-700', barBg: 'bg-emerald-500' };
  };

  const occColor = getOccupancyColor(occupancyPct);
  const waitColor = getWaitTimeColor(avgWaitTimeSec);

  // SVG Gauge Arc Math (180-degree semi-circle):
  // Arc length = PI * R = 3.14159 * 60 = 188.495
  const arcRadius = 60;
  const arcLength = Math.PI * arcRadius;
  const occStrokeDashoffset = arcLength * (1 - occupancyPct / 100);
  const waitStrokeDashoffset = arcLength * (1 - waitTimeGaugePct / 100);

  // Clinical correlation status analysis
  const hasBedSaturationBottleneck = occupancyPct >= 85 && avgWaitTimeSec >= 25;
  const isOptimalFlow = occupancyPct < 75 && avgWaitTimeSec < 20;

  // Divergence Index between Bed Occupancy % and Wait Time %
  const divergenceDelta = occupancyPct - waitTimeGaugePct;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4 shadow-sm">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-rose-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Real-Time Hospital Capacity & Queue Wait Time Telemetry
          </h3>
        </div>

        {/* View Mode Toggle & Status Badge */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented View Switcher */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-[11px]">
            <button
              onClick={() => setViewMode('combined')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                viewMode === 'combined' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Combined View
            </button>
            <button
              onClick={() => setViewMode('gauges')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                viewMode === 'gauges' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Radial Gauges
            </button>
            <button
              onClick={() => setViewMode('progress-bars')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                viewMode === 'progress-bars' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Progress Bars
            </button>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
              hasBedSaturationBottleneck
                ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse'
                : isOptimalFlow
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-amber-950 text-amber-300 border border-amber-800'
            }`}
          >
            {hasBedSaturationBottleneck ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>BED BOTTLENECK · HIGH DELAY</span>
              </>
            ) : isOptimalFlow ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>OPTIMAL FLOW</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span>CAPACITY STRAIN</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* SECTION 1: Direct Head-to-Head Comparative Progress Bar (Occupancy % vs Average Wait Time) */}
      {(viewMode === 'combined' || viewMode === 'progress-bars') && (
        <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Occupancy vs Queue Wait Time Comparison</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                (Queuing Saturation Analysis)
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-300 flex items-center gap-2">
              <span>Beds Occupied: <strong className={occColor.text}>{occupancyPct}%</strong></span>
              <span className="text-slate-600">vs</span>
              <span>Avg Wait: <strong className={waitColor.text}>{formatTime(avgWaitTimeSec)} ({waitTimeGaugePct}%)</strong></span>
            </div>
          </div>

          {/* Comparative Progress Bar Track 1: Bed Occupancy */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px] font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Bed className="w-3.5 h-3.5 text-blue-400" />
                <span>Hospital Bed Occupancy:</span>
              </span>
              <span className={`font-semibold ${occColor.text}`}>
                {occupiedBeds} of {totalBeds} Beds ({occupancyPct}%)
              </span>
            </div>
            <div className="relative w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full ${occColor.barBg} transition-all duration-500 ease-out`}
                style={{ width: `${occupancyPct}%` }}
              />
              {/* Threshold tick markers at 50%, 75%, 90% */}
              <div className="absolute top-0 bottom-0 left-[50%] w-[1px] bg-slate-700/60" title="50% Nominal" />
              <div className="absolute top-0 bottom-0 left-[75%] w-[1px] bg-amber-500/60" title="75% Elevated Load" />
              <div className="absolute top-0 bottom-0 left-[90%] w-[1px] bg-rose-500/60" title="90% Critical Saturation" />
            </div>
          </div>

          {/* Comparative Progress Bar Track 2: Patient Wait Time */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px] font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Queue Average Wait Time:</span>
              </span>
              <span className={`font-semibold ${waitColor.text}`}>
                {formatTime(avgWaitTimeSec)} avg · Max: {formatTime(maxWaitTimeSec)} ({waitTimeGaugePct}% of 90s benchmark)
              </span>
            </div>
            <div className="relative w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full ${waitColor.barBg} transition-all duration-500 ease-out`}
                style={{ width: `${waitTimeGaugePct}%` }}
              />
              {/* Threshold tick markers for wait time (20s = 22%, 45s = 50%, 75s = 83%) */}
              <div className="absolute top-0 bottom-0 left-[22%] w-[1px] bg-emerald-500/60" title="Target (<20s)" />
              <div className="absolute top-0 bottom-0 left-[50%] w-[1px] bg-amber-500/60" title="Moderate Wait (45s)" />
              <div className="absolute top-0 bottom-0 left-[83%] w-[1px] bg-rose-500/60" title="Critical Delay (75s+)" />
            </div>
          </div>

          {/* Scale Legend */}
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-1">
            <span>0% (Empty / 0s)</span>
            <span>25% Nominal</span>
            <span>50% Moderate</span>
            <span>75% Capacity Strain</span>
            <span>100% (Saturated / 90s+)</span>
          </div>
        </div>
      )}

      {/* SECTION 2: Dual Radial Gauges & Clinical Correlation Panel */}
      {(viewMode === 'combined' || viewMode === 'gauges') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Radial Gauge 1: Total Hospital Bed Occupancy Percentage */}
          <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Bed className="w-3.5 h-3.5 text-blue-400" />
                <span>Bed Occupancy Gauge</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {occupiedBeds} / {totalBeds} Active Beds
              </span>
            </div>

            {/* Semi-Circular Radial SVG Gauge */}
            <div className="relative flex flex-col items-center justify-center my-2">
              <svg className="w-44 h-24 overflow-visible" viewBox="0 0 160 90">
                {/* Background Arc Track */}
                <path
                  d="M 20 85 A 60 60 0 0 1 140 85"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="11"
                  strokeLinecap="round"
                />
                {/* Progress Arc */}
                <path
                  d="M 20 85 A 60 60 0 0 1 140 85"
                  fill="none"
                  stroke={occColor.stroke}
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={arcLength}
                  strokeDashoffset={occStrokeDashoffset}
                  className="transition-all duration-500 ease-out"
                  style={{ filter: `drop-shadow(0 0 6px ${occColor.stroke}88)` }}
                />
              </svg>

              {/* Center Readout */}
              <div className="absolute bottom-1 text-center">
                <div className={`text-2xl font-bold font-mono ${occColor.text} tabular-nums tracking-tight`}>
                  {occupancyPct}%
                </div>
                <div className="text-[10px] uppercase font-mono text-slate-400">
                  {occupancyPct >= 86 ? 'Surge Critical' : occupancyPct >= 65 ? 'Elevated' : 'Nominal'}
                </div>
              </div>
            </div>

            {/* Department Breakdown Progress Rails */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span>ER Trauma Bays:</span>
                  <span className="text-slate-200">{erOccupied}/{erBeds.length} ({erPct}%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${erPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span>OR Surgical Suites:</span>
                  <span className="text-slate-200">{orOccupied}/{orBeds.length} ({orPct}%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${orPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Radial Gauge 2: Average Patient Queue Wait Time */}
          <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Wait Time Gauge</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {queue.length} in Min-Heap
              </span>
            </div>

            {/* Semi-Circular Radial SVG Gauge */}
            <div className="relative flex flex-col items-center justify-center my-2">
              <svg className="w-44 h-24 overflow-visible" viewBox="0 0 160 90">
                {/* Background Arc Track */}
                <path
                  d="M 20 85 A 60 60 0 0 1 140 85"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="11"
                  strokeLinecap="round"
                />
                {/* Progress Arc */}
                <path
                  d="M 20 85 A 60 60 0 0 1 140 85"
                  fill="none"
                  stroke={waitColor.stroke}
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={arcLength}
                  strokeDashoffset={waitStrokeDashoffset}
                  className="transition-all duration-500 ease-out"
                  style={{ filter: `drop-shadow(0 0 6px ${waitColor.stroke}88)` }}
                />
              </svg>

              {/* Center Readout */}
              <div className="absolute bottom-1 text-center">
                <div className={`text-2xl font-bold font-mono ${waitColor.text} tabular-nums tracking-tight`}>
                  {formatTime(avgWaitTimeSec)}
                </div>
                <div className="text-[10px] uppercase font-mono text-slate-400">
                  {avgWaitTimeSec >= 45 ? 'Delayed (>45s)' : avgWaitTimeSec >= 20 ? 'Moderate Wait' : 'Target (<20s)'}
                </div>
              </div>
            </div>

            {/* Queue Wait Time Tiers Breakdown */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Peak Patient Wait:</span>
                <span className="font-bold text-slate-200">{formatTime(maxWaitTimeSec)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>High-Risk Waiting (ESI 1-2):</span>
                <span className={highRiskWaiting > 0 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                  {highRiskWaiting} Patient{highRiskWaiting === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>

          {/* Panel 3: Correlation & Surge Diagnostic / Quick Relievers */}
          <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Throughput vs Saturation</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Queuing Theory
                </span>
              </div>

              {/* Comparative Stress Bar */}
              <div className="mt-3 space-y-2">
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  {hasBedSaturationBottleneck ? (
                    <p className="text-rose-300">
                      <strong>Critical Bottleneck:</strong> Beds are {occupancyPct}% saturated, preventing queue extraction and causing average wait times to rise to {formatTime(avgWaitTimeSec)}.
                    </p>
                  ) : occupancyPct >= 70 ? (
                    <p className="text-amber-300">
                      <strong>Elevated Load:</strong> Hospital beds approaching saturation ({occupancyPct}%). Extraction rate slowing down for non-emergent cases.
                    </p>
                  ) : (
                    <p className="text-emerald-300">
                      <strong>Balanced Flow:</strong> Available beds ({totalBeds - occupiedBeds} open) ensure high-priority patients at root are admitted with minimal wait.
                    </p>
                  )}
                </div>

                {/* Stabilized Bed Notification */}
                {stabilizedCount > 0 && (
                  <div className="mt-2 p-2 rounded bg-emerald-950/70 border border-emerald-700/80 text-[11px] text-emerald-200 flex items-center justify-between">
                    <span>{stabilizedCount} Bed{stabilizedCount === 1 ? '' : 's'} ready for discharge</span>
                    {onDischargeAllStabilized && (
                      <button
                        onClick={onDischargeAllStabilized}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors text-[10px]"
                      >
                        Discharge All
                      </button>
                    )}
                  </div>
                )}

                {/* Staff Fatigue Telemetry Insight */}
                {staffFatigueState?.enabled && (
                  <div className="mt-2 p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-teal-400" />
                      <span>Staff Efficiency:</span>
                    </span>
                    <span
                      className={`font-semibold ${
                        staffFatigueState.overallEfficiencyPct < 55
                          ? 'text-rose-400'
                          : staffFatigueState.overallEfficiencyPct < 75
                          ? 'text-amber-400'
                          : 'text-teal-300'
                      }`}
                    >
                      {staffFatigueState.overallEfficiencyPct}% ({staffFatigueState.effectiveRateMultiplier}x bed pace)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Flow Actions */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-2">
              {onOpenAiRecommendations && (
                <button
                  onClick={onOpenAiRecommendations}
                  className="w-full py-1.5 px-2.5 rounded text-xs font-bold flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 via-rose-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white transition-all shadow-xs cursor-pointer"
                  title="Generate AI-recommended triage and admission moves"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>AI Moves</span>
                </button>
              )}

              {onAdmitRootToAvailable && (
                <button
                  onClick={onAdmitRootToAvailable}
                  disabled={queue.length === 0 || occupiedBeds >= totalBeds}
                  className="w-full py-1.5 px-2.5 rounded text-xs font-semibold flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white transition-colors"
                  title="Immediately admit next patient from Min-Heap into available bed"
                >
                  <span>Admit Next Patient</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
