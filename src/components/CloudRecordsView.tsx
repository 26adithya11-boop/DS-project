import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { PersistedTriageRecord, fetchUserTriageRecords } from '../firebase';
import { Cloud, RefreshCw, UserCheck, Stethoscope, Scissors, LogIn, AlertCircle } from 'lucide-react';

interface CloudRecordsViewProps {
  currentUser: User | null;
  onLogin: () => void;
}

export const CloudRecordsView: React.FC<CloudRecordsViewProps> = ({
  currentUser,
  onLogin
}) => {
  const [records, setRecords] = useState<PersistedTriageRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterDept, setFilterDept] = useState<'ALL' | 'ER' | 'OR'>('ALL');

  const loadRecords = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await fetchUserTriageRecords(currentUser.uid);
      setRecords(data);
    } catch (err) {
      console.error('Failed to load cloud triage records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadRecords();
    } else {
      setRecords([]);
    }
  }, [currentUser]);

  const filteredRecords = records.filter(r => {
    if (filterDept !== 'ALL' && r.department !== filterDept) return false;
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-400" />
            <span>Cloud Triage Records (Firestore Persistence)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Persisted clinical intake records, patient vital telemetry snapshots, and outcomes saved to Firestore.
          </p>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2">
            <button
              onClick={loadRecords}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium rounded-md transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        )}
      </div>

      {!currentUser ? (
        <div className="py-14 text-center max-w-md mx-auto space-y-3">
          <Cloud className="w-10 h-10 mx-auto text-blue-400/50" />
          <h3 className="text-sm font-semibold text-slate-200">Sign In to Enable Cloud Persistence</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Connect your Google account with Firebase Auth to securely save triage histories, bed allocations, and clinical outcomes to Firestore.
          </p>
          <button
            onClick={onLogin}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign in with Google</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Filter Department:</span>
              <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800 font-mono text-[11px]">
                <button
                  onClick={() => setFilterDept('ALL')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    filterDept === 'ALL' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({records.length})
                </button>
                <button
                  onClick={() => setFilterDept('ER')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    filterDept === 'ER' ? 'bg-blue-950 text-blue-300 font-bold border border-blue-800' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ER ({records.filter(r => r.department === 'ER').length})
                </button>
                <button
                  onClick={() => setFilterDept('OR')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    filterDept === 'OR' ? 'bg-purple-950 text-purple-300 font-bold border border-purple-800' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  OR ({records.filter(r => r.department === 'OR').length})
                </button>
              </div>
            </div>

            <div className="text-slate-500 font-mono text-[11px]">
              Logged in as: <span className="text-slate-300">{currentUser.email}</span>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
              <UserCheck className="w-7 h-7 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-medium">No Cloud Triage Records Found Yet</p>
              <p className="text-[11px] mt-1 text-slate-500">
                Admit or discharge emergency patients from the simulator to automatically store persistent records in Firestore.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Dept</th>
                    <th className="py-2.5 px-3">Presentation</th>
                    <th className="py-2.5 px-3">Vitals (HR / BP / SpO2)</th>
                    <th className="py-2.5 px-3">ESI & Urgency</th>
                    <th className="py-2.5 px-3">Outcome</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {filteredRecords.map(r => (
                    <tr key={r.id} className="hover:bg-slate-950/60 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        {r.patientName} <span className="text-slate-500 font-normal">({r.age}y)</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.department === 'OR'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}
                        >
                          {r.department}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-300 max-w-[200px] truncate" title={r.chiefComplaint}>
                        {r.chiefComplaint}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        <span className="text-rose-400">{r.heartRate} bpm</span> ·{' '}
                        <span className="text-amber-400">{r.systolicBp}/{r.diastolicBp}</span> ·{' '}
                        <span className="text-sky-400">{r.oxygenSat}%</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-200">{r.urgencyScore.toFixed(3)}</span>{' '}
                        <span className={`font-semibold ml-1 ${r.esiLevel === 1 ? 'text-rose-400' : r.esiLevel === 2 ? 'text-amber-400' : 'text-yellow-400'}`}>
                          (ESI-{r.esiLevel})
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800 text-[10px]">
                          {r.treatmentOutcome}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                        {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
