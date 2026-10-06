import React, { useState, useEffect } from 'react';
import { Patient, BedSlot, HospitalMetrics } from '../types/hospital';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  ArrowRightLeft,
  RefreshCw,
  X,
  ShieldCheck,
  Bed,
  Check,
  Layers,
  Activity,
  Bot
} from 'lucide-react';

export interface ClinicalMove {
  id: string;
  actionType: 'DISCHARGE_BED' | 'TRANSFER_ICU' | 'TRANSFER_OR' | 'ADMIT_TO_BED';
  title: string;
  patientId?: number;
  patientName?: string;
  bedId?: string;
  bedName?: string;
  reasoning: string;
  expectedImpact: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface RecommendationResponse {
  assessment: string;
  congestionStatus: 'CRITICAL' | 'ELEVATED' | 'NOMINAL';
  recommendedMoves: ClinicalMove[];
  generatedBy?: 'GEMINI_AI' | 'CLINICAL_HEURISTIC_FALLBACK';
}

interface AiRecommendationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Patient[];
  beds: BedSlot[];
  metrics: HospitalMetrics;
  onExecuteMoves: (moves: ClinicalMove[]) => void;
}

export const AiRecommendationsModal: React.FC<AiRecommendationsModalProps> = ({
  isOpen,
  onClose,
  queue,
  beds,
  metrics,
  onExecuteMoves,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [assessment, setAssessment] = useState<string>('');
  const [congestionStatus, setCongestionStatus] = useState<'CRITICAL' | 'ELEVATED' | 'NOMINAL'>('NOMINAL');
  const [moves, setMoves] = useState<ClinicalMove[]>([]);
  const [selectedMoveIds, setSelectedMoveIds] = useState<Set<string>>(new Set());
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [generatedBy, setGeneratedBy] = useState<string>('GEMINI_AI');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch AI recommendations from server
  const fetchRecommendations = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queue,
          beds,
          metrics,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data: RecommendationResponse = await res.json();
      setAssessment(data.assessment || 'Recommendations generated based on priority queue telemetry.');
      setCongestionStatus(data.congestionStatus || 'NOMINAL');
      setMoves(data.recommendedMoves || []);
      setGeneratedBy(data.generatedBy || 'GEMINI_AI');

      // Select all moves by default for single-click execution
      const allIds = new Set((data.recommendedMoves || []).map(m => m.id));
      setSelectedMoveIds(allIds);
    } catch (err: any) {
      console.error('Failed to fetch AI recommendations:', err);
      setFetchError(err.message || 'Unable to contact recommendation server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecommendations();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle move selection
  const toggleMove = (id: string) => {
    setSelectedMoveIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedMoveIds(new Set(moves.map(m => m.id)));
  };

  const deselectAll = () => {
    setSelectedMoveIds(new Set());
  };

  // Implement selected moves with single-click
  const handleImplement = async () => {
    const selectedMoves = moves.filter(m => selectedMoveIds.has(m.id));
    if (selectedMoves.length === 0) return;

    setIsExecuting(true);
    // Visual feedback delay
    await new Promise(resolve => setTimeout(resolve, 350));
    onExecuteMoves(selectedMoves);
    setIsExecuting(false);
    onClose();
  };

  // Implement a single move immediately
  const handleImplementSingle = (move: ClinicalMove) => {
    onExecuteMoves([move]);
    onClose();
  };

  const selectedCount = selectedMoveIds.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500/20 via-purple-500/20 to-blue-500/20 border border-rose-500/40 text-rose-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  AI Clinical Operations Advisor
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                  {generatedBy === 'GEMINI_AI' ? 'Gemini 2.5 Flash' : 'Clinical Heuristic'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time queue re-balancing, bed bottleneck mitigation, and prioritized admission moves.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchRecommendations}
              disabled={loading || isExecuting}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-40"
              title="Refresh recommendations with fresh hospital telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-sm font-semibold text-slate-200">
                Analyzing Min-Heap Invariants & Bed Saturation...
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Consulting Gemini AI to evaluate patient vitals, waiting times, and post-op stabilization states to generate optimal moves.
              </p>
            </div>
          ) : fetchError ? (
            <div className="p-4 rounded-lg bg-rose-950/60 border border-rose-700 text-xs text-rose-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-rose-300">
                <AlertTriangle className="w-4 h-4" />
                <span>Error generating AI moves</span>
              </div>
              <p>{fetchError}</p>
              <button
                onClick={fetchRecommendations}
                className="px-3 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded text-xs font-semibold"
              >
                Retry Analysis
              </button>
            </div>
          ) : (
            <>
              {/* Executive Situation Assessment Banner */}
              <div
                className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                  congestionStatus === 'CRITICAL'
                    ? 'bg-rose-950/50 border-rose-700/80 text-rose-200'
                    : congestionStatus === 'ELEVATED'
                    ? 'bg-amber-950/50 border-amber-700/80 text-amber-200'
                    : 'bg-emerald-950/50 border-emerald-700/80 text-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Clinical Flow Diagnosis</span>
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                      congestionStatus === 'CRITICAL'
                        ? 'bg-rose-900 border-rose-600 text-white animate-pulse'
                        : congestionStatus === 'ELEVATED'
                        ? 'bg-amber-900 border-amber-600 text-amber-100'
                        : 'bg-emerald-900 border-emerald-600 text-emerald-100'
                    }`}
                  >
                    STATUS: {congestionStatus} LOAD
                  </span>
                </div>
                <p className="leading-relaxed text-slate-200 font-sans">{assessment}</p>
              </div>

              {/* Moves Selection Header */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                    Suggested Operational Moves ({moves.length})
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    · {selectedCount} of {moves.length} Selected
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    onClick={selectAll}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-slate-400 hover:text-slate-300 font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Moves Cards List */}
              {moves.length === 0 ? (
                <div className="py-10 text-center text-slate-500 bg-slate-950/50 rounded-lg border border-slate-800">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-400" />
                  <p className="text-xs font-semibold text-slate-300">Optimal Triage Balance</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    No immediate moves required. Beds and priority queue are operating within safe clinical tolerances.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {moves.map(move => {
                    const isSelected = selectedMoveIds.has(move.id);
                    const isAdmit = move.actionType === 'ADMIT_TO_BED';
                    const isDischarge = move.actionType === 'DISCHARGE_BED';
                    const isIcu = move.actionType === 'TRANSFER_ICU';
                    const isOr = move.actionType === 'TRANSFER_OR';

                    return (
                      <div
                        key={move.id}
                        onClick={() => toggleMove(move.id)}
                        className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-slate-950 border-rose-500/80 shadow-md ring-1 ring-rose-500/30'
                            : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 opacity-70'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div className="pt-0.5 shrink-0">
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-rose-600 border-rose-500 text-white'
                                  : 'border-slate-600 bg-slate-900'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {/* Action Badge */}
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                    isAdmit
                                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                      : isDischarge
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : isIcu
                                      ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                                  }`}
                                >
                                  {isAdmit && <ArrowRight className="w-3 h-3" />}
                                  {isDischarge && <UserCheck className="w-3 h-3" />}
                                  {isIcu && <ArrowRightLeft className="w-3 h-3" />}
                                  {isOr && <Bed className="w-3 h-3" />}
                                  <span>{move.actionType.replace('_', ' ')}</span>
                                </span>

                                <span className="font-semibold text-xs text-slate-100">
                                  {move.title}
                                </span>
                              </div>

                              {/* Priority Pill */}
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                  move.priority === 'HIGH'
                                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                    : move.priority === 'MEDIUM'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {move.priority} PRIORITY
                              </span>
                            </div>

                            {/* Clinical Reasoning */}
                            <p className="text-xs text-slate-300 leading-relaxed font-sans">
                              {move.reasoning}
                            </p>

                            {/* Impact Readout */}
                            <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-cyan-300/90 border-t border-slate-900">
                              <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3 text-cyan-400" />
                                <span>{move.expectedImpact}</span>
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImplementSingle(move);
                                }}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                                title="Implement just this single move right now"
                              >
                                Execute Alone
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer (Single-Click Execution) */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {selectedCount > 0 ? (
              <span>
                Ready to execute <strong className="text-slate-100">{selectedCount}</strong> clinical move{selectedCount === 1 ? '' : 's'} sequentially.
              </span>
            ) : (
              <span>Select one or more moves above to execute.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>

            {/* The single-click execution button */}
            <button
              onClick={handleImplement}
              disabled={selectedCount === 0 || isExecuting || loading}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 disabled:opacity-40 disabled:hover:from-rose-600 disabled:hover:to-amber-500 text-white flex items-center gap-2 shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing Clinical Moves...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-white" />
                  <span>
                    Implement {selectedCount > 0 ? `${selectedCount} ` : ''}Recommendation{selectedCount === 1 ? '' : 's'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
