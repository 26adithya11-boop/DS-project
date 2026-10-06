import React, { useState } from 'react';
import { C_HEADER_SOURCE, C_IMPLEMENTATION_SOURCE } from '../engine/cEngineCode';
import { HeapTraceStep } from '../types/hospital';
import { Code2, Terminal, Cpu, Copy, Check, Download, Layers } from 'lucide-react';

interface CEngineInspectorProps {
  traceLog: HeapTraceStep[];
  currentHeapSize: number;
}

export const CEngineInspector: React.FC<CEngineInspectorProps> = ({
  traceLog,
  currentHeapSize
}) => {
  const [activeTab, setActiveTab] = useState<'implementation' | 'header' | 'memory' | 'logs'>('implementation');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleCopy = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-slate-100">
              C Priority Queue Kernel & Memory Inspector
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Genuine C99 Min-Heap binary queue with continuous array storage and $O(\log n)$ bubble-up / min-heapify.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-md border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('implementation')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeTab === 'implementation' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              triage_engine.c
            </button>
            <button
              onClick={() => setActiveTab('header')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeTab === 'header' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              triage_engine.h
            </button>
            <button
              onClick={() => setActiveTab('memory')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeTab === 'memory' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Memory Struct
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeTab === 'logs' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              C stdout Logs ({traceLog.length})
            </button>
          </div>

          {/* Copy Button */}
          {activeTab === 'implementation' && (
            <button
              onClick={() => handleCopy(C_IMPLEMENTATION_SOURCE, 'c')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors"
            >
              {copiedType === 'c' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'c' ? 'Copied' : 'Copy .c'}</span>
            </button>
          )}
          {activeTab === 'header' && (
            <button
              onClick={() => handleCopy(C_HEADER_SOURCE, 'h')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors"
            >
              {copiedType === 'h' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'h' ? 'Copied' : 'Copy .h'}</span>
            </button>
          )}
          {(activeTab === 'implementation' || activeTab === 'header') && (
            <button
              onClick={() =>
                activeTab === 'implementation'
                  ? handleDownload('triage_engine.c', C_IMPLEMENTATION_SOURCE)
                  : handleDownload('triage_engine.h', C_HEADER_SOURCE)
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors"
              title="Download C Source File"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="mt-4">
        {activeTab === 'implementation' && (
          <div className="relative rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                <span>triage_engine.c · Standard C99 (Heap Logic, Swaps, Math)</span>
              </div>
              <div className="text-[11px] text-slate-500">
                gcc -O3 -Wall -Wextra triage_engine.c -o triage_sim
              </div>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{C_IMPLEMENTATION_SOURCE}</code>
            </pre>
          </div>
        )}

        {activeTab === 'header' && (
          <div className="relative rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-purple-400" />
                <span>triage_engine.h · Data Types, Struct Definitions, Prototypes</span>
              </div>
              <div className="text-[11px] text-slate-500">
                #define MAX_HEAP_CAPACITY 256
              </div>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{C_HEADER_SOURCE}</code>
            </pre>
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="space-y-4">
            <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>C Struct Memory Alignment & Cache Locality</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Unlike pointer-based linked trees, this binary heap stores every patient inside a single continuous 
                contiguous memory buffer (<code>Patient data[256];</code>). Each node is aligned for high CPU L1/L2 cache hit rate.
              </p>

              {/* Memory block breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded bg-slate-900 border border-slate-800">
                  <div className="font-bold text-amber-400 mb-2">Patient Struct Layout (192 Bytes / Node)</div>
                  <div className="space-y-1.5 text-slate-300 text-[11px]">
                    <div className="flex justify-between py-0.5 border-b border-slate-800">
                      <span>uint32_t id</span>
                      <span className="text-slate-500">Offset +0 (4 bytes)</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-800">
                      <span>char name[48]</span>
                      <span className="text-slate-500">Offset +4 (48 bytes)</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-800">
                      <span>age, gender, dept, esi</span>
                      <span className="text-slate-500">Offset +52 (4 bytes)</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-800">
                      <span>char complaint[96]</span>
                      <span className="text-slate-500">Offset +56 (96 bytes)</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-800">
                      <span>Vitals vitals</span>
                      <span className="text-slate-500">Offset +152 (24 bytes)</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-800">
                      <span>float calculated_urgency</span>
                      <span className="text-emerald-400">Offset +176 (4 bytes)</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span>uint64_t arrival_epoch</span>
                      <span className="text-slate-500">Offset +180 (8 bytes)</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded bg-slate-900 border border-slate-800">
                  <div className="font-bold text-cyan-400 mb-2">Heap Array Math & Zero Pointers</div>
                  <div className="space-y-2 text-slate-300 text-[11px]">
                    <div>
                      <strong className="text-slate-200">Parent Index:</strong>
                      <div className="text-slate-400 mt-0.5"><code>(i - 1) &gt;&gt; 1</code> (Floor integer division)</div>
                    </div>
                    <div>
                      <strong className="text-slate-200">Left Child:</strong>
                      <div className="text-slate-400 mt-0.5"><code>(i &lt;&lt; 1) + 1</code> (Bitshift multiply by 2 + 1)</div>
                    </div>
                    <div>
                      <strong className="text-slate-200">Right Child:</strong>
                      <div className="text-slate-400 mt-0.5"><code>(i &lt;&lt; 1) + 2</code> (Bitshift multiply by 2 + 2)</div>
                    </div>
                    <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                      Current buffer usage: {currentHeapSize} / 256 nodes ({((currentHeapSize * 192) / 1024).toFixed(1)} KB active heap memory)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="rounded-lg bg-slate-950 border border-slate-800 p-4">
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-800 text-xs font-mono text-slate-400">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Real-Time C Kernel Execution Traces (Min-Heap Invariants & Swaps)</span>
            </div>

            {traceLog.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-mono">
                No C execution traces yet. Perform an insert or extract to trigger kernel execution.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto font-mono text-[11px] pr-2">
                {traceLog.slice().reverse().map(step => (
                  <div
                    key={step.id}
                    className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                          step.action === 'SWAP'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : step.action === 'EXTRACT_ROOT'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}>
                          {step.action}
                        </span>
                        <span className="text-slate-300 font-semibold">
                          Patient #{step.patientId} ({step.patientName})
                        </span>
                      </div>
                      <div className="text-slate-400 mt-1 text-[10px]">
                        {step.explanation}
                      </div>
                    </div>
                    <div className="text-right shrink-0 text-slate-500 text-[10px]">
                      <div>Line {step.cCodeLine}</div>
                      <div>{new Date(step.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
