import React, { useState } from 'react';
import { Patient, HeapTraceStep } from '../types/hospital';
import { Network, ListOrdered, ArrowDownUp, CheckCircle, ShieldAlert, Sparkles, Activity, AlertTriangle, Eye, Flame } from 'lucide-react';

interface HeapVisualizerProps {
  queue: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onExtractRoot: () => void;
  recentTraceStep: HeapTraceStep | null;
  heapSwapsCount: number;
}

/**
 * Calculates continuous shifted color styles based on relative urgency score:
 * 1.000 = Immediate / Imminent Arrest (Bright solid red with glowing aura)
 * 2.000 = Emergent (Fiery orange / coral)
 * 3.000 = Urgent (Warm golden amber)
 * 4.000 = Semi-urgent (Muted teal / cyan)
 * 5.000 = Stable / Routine (Semi-transparent emerald green)
 */
export function getUrgencyNodeStyle(urgency: number) {
  // Normalize score between 0 (most critical: 1.0) and 1 (most stable: 5.0)
  const norm = Math.max(0, Math.min(1, (urgency - 1.0) / 4.0));

  let r: number, g: number, b: number;
  let bgAlpha: number, borderAlpha: number, glow: string;
  let label: string, categoryClass: string;

  if (norm <= 0.25) {
    // 1.0 to 2.0: Bright Radiant Red to Coral
    const t = norm / 0.25;
    r = Math.round(239 + t * (249 - 239)); // 239 -> 249
    g = Math.round(68 + t * (115 - 68));   // 68 -> 115
    b = Math.round(68 + t * (22 - 68));    // 68 -> 22
    bgAlpha = 0.94 - t * 0.12;             // 0.94 -> 0.82
    borderAlpha = 1.0;
    glow = `0 0 ${Math.round(20 - t * 8)}px rgba(${r}, ${g}, ${b}, 0.7)`;
    label = 'CRITICAL';
    categoryClass = 'text-rose-100 font-bold';
  } else if (norm <= 0.50) {
    // 2.0 to 3.0: Coral / Orange to Warm Amber
    const t = (norm - 0.25) / 0.25;
    r = Math.round(249 + t * (217 - 249)); // 249 -> 217
    g = Math.round(115 + t * (119 - 115)); // 115 -> 119
    b = Math.round(22 + t * (6 - 22));     // 22 -> 6
    bgAlpha = 0.82 - t * 0.18;             // 0.82 -> 0.64
    borderAlpha = 0.85;
    glow = `0 0 10px rgba(${r}, ${g}, ${b}, 0.4)`;
    label = 'HIGH RISK';
    categoryClass = 'text-amber-100 font-bold';
  } else if (norm <= 0.75) {
    // 3.0 to 4.0: Warm Amber to Muted Teal
    const t = (norm - 0.50) / 0.25;
    r = Math.round(217 + t * (13 - 217));  // 217 -> 13
    g = Math.round(119 + t * (148 - 119)); // 119 -> 148
    b = Math.round(6 + t * (136 - 6));     // 6 -> 136
    bgAlpha = 0.64 - t * 0.22;             // 0.64 -> 0.42
    borderAlpha = 0.65;
    glow = 'none';
    label = 'URGENT';
    categoryClass = 'text-yellow-100 font-medium';
  } else {
    // 4.0 to 5.0: Muted Teal to Semi-Transparent Emerald Green
    const t = (norm - 0.75) / 0.25;
    r = Math.round(13 + t * (16 - 13));    // 13 -> 16
    g = Math.round(148 + t * (185 - 148)); // 148 -> 185
    b = Math.round(136 + t * (129 - 136)); // 136 -> 129
    bgAlpha = 0.42 - t * 0.24;             // 0.42 -> 0.18 (semi-transparent green)
    borderAlpha = 0.45;
    glow = 'none';
    label = norm >= 0.9 ? 'STABLE' : 'SEMI-URGENT';
    categoryClass = 'text-emerald-100 font-normal';
  }

  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${bgAlpha.toFixed(2)})`,
    borderColor: `rgba(${r}, ${g}, ${b}, ${borderAlpha})`,
    boxShadow: glow,
    color: '#ffffff',
    label,
    categoryClass,
    isCritical: urgency <= 1.80,
    isHighRisk: urgency < 2.50,
    isStable: urgency >= 4.20,
    norm
  };
}

export const HeapVisualizer: React.FC<HeapVisualizerProps> = ({
  queue,
  onSelectPatient,
  onExtractRoot,
  recentTraceStep,
  heapSwapsCount
}) => {
  const [viewMode, setViewMode] = useState<'tree' | 'array'>('tree');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [highlightHighRiskPaths, setHighlightHighRiskPaths] = useState<boolean>(true);

  // Check heap invariant across all elements
  let isHeapValid = true;
  for (let i = 0; i < queue.length; i++) {
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    if (left < queue.length && queue[i].calculatedUrgency > queue[left].calculatedUrgency) {
      isHeapValid = false;
      break;
    }
    if (right < queue.length && queue[i].calculatedUrgency > queue[right].calculatedUrgency) {
      isHeapValid = false;
      break;
    }
  }

  // Calculate coordinates for binary tree nodes
  const calculateNodePosition = (index: number) => {
    const level = Math.floor(Math.log2(index + 1));
    const itemsInLevel = Math.pow(2, level);
    const positionInLevel = index - (itemsInLevel - 1);
    
    // Spread evenly across width
    const totalWidth = 920;
    const slotWidth = totalWidth / itemsInLevel;
    const x = slotWidth * positionInLevel + slotWidth / 2;
    const y = 50 + level * 95;

    return { x, y, level };
  };

  const treeHeight = queue.length > 0 ? Math.floor(Math.log2(queue.length)) + 1 : 0;

  // Get full ancestor path to root for hovered node
  const getAncestorIndices = (index: number | null): number[] => {
    if (index === null || index < 0) return [];
    const ancestors = [index];
    let curr = index;
    while (curr > 0) {
      curr = Math.floor((curr - 1) / 2);
      ancestors.push(curr);
    }
    return ancestors;
  };

  const hoveredAncestors = getAncestorIndices(hoveredIndex);

  // Count high risk vs moderate vs stable
  const criticalCount = queue.filter(p => p.calculatedUrgency <= 2.0).length;
  const emergentCount = queue.filter(p => p.calculatedUrgency > 2.0 && p.calculatedUrgency <= 2.8).length;
  const urgentCount = queue.filter(p => p.calculatedUrgency > 2.8 && p.calculatedUrgency <= 3.8).length;
  const stableCount = queue.filter(p => p.calculatedUrgency > 3.8).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
      {/* Control Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Network className="w-4 h-4 text-rose-400" />
              <span>Priority Queue Min-Heap</span>
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Size: <strong className="font-mono text-slate-200">{queue.length}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Height: <strong className="font-mono text-slate-200">{treeHeight}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Swaps: <strong className="font-mono text-slate-200">{heapSwapsCount}</strong></span>
              <span aria-hidden="true">·</span>
              <span className={`inline-flex items-center gap-1 font-mono text-[11px] ${isHeapValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isHeapValid ? <CheckCircle className="w-3.5 h-3.5 inline" /> : <ShieldAlert className="w-3.5 h-3.5 inline" />}
                {isHeapValid ? 'Heap Invariant OK' : 'Heap Invariant Violated'}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic relative urgency coloring: <span className="text-rose-400 font-semibold">Bright Red (Critical)</span> shifts continuously to <span className="text-emerald-400 font-semibold">Semi-transparent Green (Stable)</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* High-Risk Path Toggle */}
          <button
            onClick={() => setHighlightHighRiskPaths(h => !h)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
              highlightHighRiskPaths
                ? 'bg-rose-950/80 text-rose-200 border-rose-600 shadow-xs'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle glowing highlight for high-risk triage paths (Urgency < 2.5)"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>High-Risk Paths: {highlightHighRiskPaths ? 'ON' : 'OFF'}</span>
          </button>

          {/* Segmented View Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-md border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === 'tree' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Binary Tree</span>
            </button>
            <button
              onClick={() => setViewMode('array')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === 'array' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>C Memory Array</span>
            </button>
          </div>

          {/* Extract Root Button */}
          <button
            onClick={onExtractRoot}
            disabled={queue.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white text-xs font-semibold rounded-md transition-colors shadow-xs"
            title="O(log n) Extract root patient for immediate ER/OR admission"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            <span>Extract Min (Root)</span>
          </button>
        </div>
      </div>

      {/* Relative Urgency Gradient Spectrum Strip */}
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-300 whitespace-nowrap text-[11px] uppercase tracking-wider">
            Urgency Spectrum:
          </span>
          {/* Continuous Color Gradient Bar */}
          <div className="relative w-44 sm:w-60 h-2.5 rounded-full overflow-hidden bg-gradient-to-r from-rose-600 via-amber-500 via-teal-500 to-emerald-500/30 border border-slate-700">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 gap-2">
            <span className="text-rose-400 font-bold">1.0 Critical</span>
            <span className="text-slate-600">→</span>
            <span className="text-emerald-400 font-bold">5.0 Stable</span>
          </div>
        </div>

        {/* Live Patient Risk Counters */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800" title="Urgency <= 2.0 (ESI-1)">
            Critical: <strong>{criticalCount}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800" title="Urgency 2.0 - 2.8 (ESI-2)">
            Emergent: <strong>{emergentCount}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800" title="Urgency 2.8 - 3.8 (ESI-3)">
            Urgent: <strong>{urgentCount}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800" title="Urgency >= 3.8 (ESI-4, 5)">
            Stable: <strong>{stableCount}</strong>
          </span>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div>
        {queue.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-medium">Heap Queue is Empty</p>
            <p className="text-xs mt-1">Admit emergency patients or trigger a Mass Casualty Wave to populate the priority queue.</p>
          </div>
        ) : viewMode === 'tree' ? (
          /* Binary Heap Tree View (SVG + HTML Interactive Overlay) */
          <div className="relative overflow-x-auto min-h-[380px] bg-slate-950/70 rounded border border-slate-800/80 p-4">
            <div className="min-w-[920px] relative" style={{ height: `${Math.max(360, (treeHeight + 0.5) * 95)}px` }}>
              {/* SVG Connecting Edges with High-Risk Path Visualization */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 920 ${Math.max(360, (treeHeight + 0.5) * 95)}`}>
                <defs>
                  {/* Subtle edge for regular branches */}
                  <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#475569" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#334155" stopOpacity="0.3" />
                  </linearGradient>

                  {/* Blazing Red / Coral gradient for High-Risk Triage Paths */}
                  <linearGradient id="criticalPathGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.85" />
                  </linearGradient>

                  {/* Active operation swap highlight */}
                  <linearGradient id="activeEdgeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                  </linearGradient>

                  {/* Filter for glowing high risk lines */}
                  <filter id="glowCritical" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#f43f5e" floodOpacity="0.8" />
                  </filter>
                  <filter id="glowActive" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.9" />
                  </filter>
                </defs>

                {queue.map((childPatient, i) => {
                  if (i === 0) return null;
                  const parentIdx = Math.floor((i - 1) / 2);
                  const parentPatient = queue[parentIdx];
                  const from = calculateNodePosition(parentIdx);
                  const to = calculateNodePosition(i);

                  // Is this edge in an active swap trace?
                  const isTraceHighlighted =
                    recentTraceStep &&
                    (recentTraceStep.targetIndex === i || recentTraceStep.parentIndex === i);

                  // Is this edge on the ancestor path of the currently hovered node?
                  const isHoveredPath =
                    hoveredAncestors.includes(i) && hoveredAncestors.includes(parentIdx);

                  // High-Risk Triage Path: connecting nodes where urgency is elevated (< 2.5)
                  const isHighRiskPath =
                    parentPatient.calculatedUrgency < 2.5 && childPatient.calculatedUrgency < 2.5;

                  let stroke = 'url(#edgeGrad)';
                  let strokeWidth = 1.5;
                  let filter = undefined;
                  let strokeDasharray = undefined;

                  if (isTraceHighlighted) {
                    stroke = 'url(#activeEdgeGrad)';
                    strokeWidth = 3;
                    filter = 'url(#glowActive)';
                    strokeDasharray = '4 2';
                  } else if (isHoveredPath) {
                    stroke = '#38bdf8';
                    strokeWidth = 3.5;
                    filter = 'url(#glowActive)';
                  } else if (highlightHighRiskPaths && isHighRiskPath) {
                    stroke = 'url(#criticalPathGrad)';
                    strokeWidth = 3;
                    filter = 'url(#glowCritical)';
                  }

                  return (
                    <line
                      key={`edge-${parentIdx}-${i}`}
                      x1={from.x}
                      y1={from.y + 18}
                      x2={to.x}
                      y2={to.y - 18}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      filter={filter}
                      strokeDasharray={strokeDasharray}
                    />
                  );
                })}
              </svg>

              {/* Tree Nodes with Dynamic Shifting Urgency Colors */}
              {queue.map((patient, i) => {
                const { x, y } = calculateNodePosition(i);
                const isRoot = i === 0;
                const isTraceTarget = recentTraceStep && recentTraceStep.targetIndex === i;
                const isHovered = hoveredIndex === i;
                const isInHoveredPath = hoveredAncestors.includes(i);

                // Get dynamic continuous shifted color styling based on urgency score
                const nodeTheme = getUrgencyNodeStyle(patient.calculatedUrgency);

                return (
                  <div
                    key={`node-${patient.id}-${i}`}
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => onSelectPatient(patient)}
                    className={`absolute cursor-pointer transition-all duration-200 select-none z-10 ${
                      isTraceTarget ? 'scale-110' : isHovered ? 'scale-105' : 'hover:scale-102'
                    }`}
                  >
                    <div
                      className={`relative px-3 py-2 rounded-lg border text-left backdrop-blur-xs transition-all ${
                        isRoot
                          ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-950'
                          : isTraceTarget
                          ? 'ring-2 ring-amber-400'
                          : isInHoveredPath
                          ? 'ring-1 ring-cyan-400'
                          : ''
                      }`}
                      style={{
                        backgroundColor: nodeTheme.backgroundColor,
                        borderColor: nodeTheme.borderColor,
                        boxShadow: isHovered
                          ? '0 0 20px rgba(56, 189, 248, 0.7)'
                          : isTraceTarget
                          ? '0 0 20px rgba(251, 191, 36, 0.8)'
                          : nodeTheme.boxShadow,
                        minWidth: '140px',
                        maxWidth: '175px'
                      }}
                    >
                      {/* Root Badge */}
                      {isRoot && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-600 text-[9px] font-bold tracking-wider text-white px-2 py-0.5 rounded-full uppercase shadow-md flex items-center gap-1 whitespace-nowrap">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>ROOT · NEXT OUT</span>
                        </div>
                      )}

                      {/* Top Row: Index & Dept */}
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-200">
                        <span className="font-bold drop-shadow-xs">
                          [{i}] #{patient.id}
                        </span>
                        <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                          patient.department === 'OR' ? 'bg-purple-950/90 text-purple-200 border border-purple-700' : 'bg-blue-950/90 text-blue-200 border border-blue-700'
                        }`}>
                          {patient.department}
                        </span>
                      </div>

                      {/* Name & Complaint */}
                      <div className="mt-1">
                        <div className="text-xs font-semibold text-white truncate drop-shadow-xs" title={patient.name}>
                          {patient.name}
                        </div>
                        <div className="text-[10px] text-slate-200/90 truncate" title={patient.chiefComplaint}>
                          {patient.chiefComplaint}
                        </div>
                      </div>

                      {/* Bottom Row: Score & Urgency Shift Label */}
                      <div className="mt-1.5 pt-1 border-t border-white/20 flex items-center justify-between text-[10px]">
                        <span className="font-mono font-bold text-white drop-shadow-xs">
                          {patient.calculatedUrgency.toFixed(3)}
                        </span>
                        <span className={`font-semibold tracking-wide ${nodeTheme.categoryClass}`}>
                          {nodeTheme.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Contiguous Array View (C Memory Simulation with Dynamic Urgency Colors) */
          <div className="overflow-x-auto bg-slate-950 rounded border border-slate-800 p-4">
            <div className="text-xs font-mono text-slate-400 mb-3 flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-bold">C ARRAY BUFFER:</span>{' '}
                <code>Patient heap[256];</code> · Continuous 128-byte Structs
              </div>
              <div className="text-[11px] text-slate-400">
                Hover index <code>i</code> to inspect <code>Parent((i-1)/2)</code>, <code>Left(2i+1)</code>, and <code>Right(2i+2)</code>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {queue.map((patient, i) => {
                const parentIdx = Math.floor((i - 1) / 2);
                const leftChild = 2 * i + 1;
                const rightChild = 2 * i + 2;
                const isRoot = i === 0;

                const isParentOfHovered = hoveredIndex !== null && parentIdx === hoveredIndex;
                const isChildOfHovered = hoveredIndex !== null && (hoveredIndex === leftChild || hoveredIndex === rightChild);
                const isCurrentHover = hoveredIndex === i;

                // Dynamic Shifted Color Style
                const nodeTheme = getUrgencyNodeStyle(patient.calculatedUrgency);

                return (
                  <div
                    key={`arr-${patient.id}-${i}`}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => onSelectPatient(patient)}
                    style={{
                      backgroundColor: nodeTheme.backgroundColor,
                      borderColor: isCurrentHover ? '#38bdf8' : nodeTheme.borderColor,
                      boxShadow: isCurrentHover ? '0 0 16px rgba(56, 189, 248, 0.6)' : nodeTheme.boxShadow
                    }}
                    className={`cursor-pointer rounded border p-2.5 transition-all text-xs backdrop-blur-xs ${
                      isCurrentHover
                        ? 'ring-2 ring-cyan-400 scale-102'
                        : isParentOfHovered
                        ? 'ring-1 ring-amber-400'
                        : isChildOfHovered
                        ? 'ring-1 ring-emerald-400'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-200 mb-1">
                      <span className="font-bold">heap[{i}]</span>
                      <span className="text-[9px] text-slate-300 font-mono">0x{(0x7ff000 + i * 128).toString(16)}</span>
                    </div>

                    <div className="font-semibold text-white truncate drop-shadow-xs">{patient.name}</div>
                    <div className="text-[10px] text-slate-200/90 truncate">{patient.chiefComplaint}</div>

                    <div className="mt-2 pt-1.5 border-t border-white/20 flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold text-white">{patient.calculatedUrgency.toFixed(3)}</span>
                      <span className={`font-semibold ${nodeTheme.categoryClass}`}>{nodeTheme.label}</span>
                    </div>

                    {isCurrentHover && (
                      <div className="mt-2 pt-1 text-[9px] font-mono border-t border-slate-700/60 text-slate-200">
                        {i > 0 && <div>P: heap[{parentIdx}]</div>}
                        {leftChild < queue.length && <div>L: heap[{leftChild}]</div>}
                        {rightChild < queue.length && <div>R: heap[{rightChild}]</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Heap Operation Live Trace Strip */}
      {recentTraceStep && (
        <div className="mt-2 py-2 px-3 bg-slate-950 rounded border border-slate-800 text-xs flex items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2 truncate">
            <span className="text-amber-400 font-bold">[{recentTraceStep.action}]</span>
            <span className="text-slate-300 truncate">{recentTraceStep.explanation}</span>
          </div>
          <div className="text-slate-500 shrink-0 text-[11px]">
            <span>Line {recentTraceStep.cCodeLine}</span>
          </div>
        </div>
      )}
    </div>
  );
};
