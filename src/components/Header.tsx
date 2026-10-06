import React from 'react';
import { Siren, UserPlus, LogIn, LogOut, Cloud, User as UserIcon, FileText, Sparkles } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  activeView: 'dashboard' | 'hospital' | 'c-kernel' | 'scenarios' | 'records' | 'shift-report';
  onSelectView: (view: 'dashboard' | 'hospital' | 'c-kernel' | 'scenarios' | 'records' | 'shift-report') => void;
  onOpenIntakeModal: () => void;
  onTriggerMassCasualty: () => void;
  onOpenAiRecommendations?: () => void;
  codeRedActive: boolean;
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onSelectView,
  onOpenIntakeModal,
  onTriggerMassCasualty,
  onOpenAiRecommendations,
  codeRedActive,
  currentUser,
  onLogin,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onSelectView('dashboard');
            }}
            className="text-lg font-bold tracking-tight text-slate-100 hover:text-white transition-colors"
          >
            ER FLOW
          </a>
        </div>

        {/* Zone 2: Clean Text Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-400">
          <button
            onClick={() => onSelectView('dashboard')}
            className={`transition-colors py-1 ${
              activeView === 'dashboard'
                ? 'text-white font-semibold border-b-2 border-rose-500'
                : 'hover:text-slate-200'
            }`}
          >
            Triage & Heap
          </button>
          <button
            onClick={() => onSelectView('hospital')}
            className={`transition-colors py-1 ${
              activeView === 'hospital'
                ? 'text-white font-semibold border-b-2 border-rose-500'
                : 'hover:text-slate-200'
            }`}
          >
            ER & OR Floor
          </button>
          <button
            onClick={() => onSelectView('c-kernel')}
            className={`transition-colors py-1 ${
              activeView === 'c-kernel'
                ? 'text-white font-semibold border-b-2 border-rose-500'
                : 'hover:text-slate-200'
            }`}
          >
            C Kernel & Memory
          </button>
          <button
            onClick={() => onSelectView('scenarios')}
            className={`transition-colors py-1 ${
              activeView === 'scenarios'
                ? 'text-white font-semibold border-b-2 border-rose-500'
                : 'hover:text-slate-200'
            }`}
          >
            Clinical Cases
          </button>
          <button
            onClick={() => onSelectView('records')}
            className={`transition-colors py-1 flex items-center gap-1.5 ${
              activeView === 'records'
                ? 'text-white font-semibold border-b-2 border-rose-500'
                : 'hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-blue-400" />
            <span>Cloud Records</span>
          </button>
          <button
            onClick={() => onSelectView('shift-report')}
            className={`transition-colors py-1 flex items-center gap-1.5 ${
              activeView === 'shift-report'
                ? 'text-white font-semibold border-b-2 border-rose-500'
                : 'hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Shift Report</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action Buttons & Auth */}
        <div className="flex items-center gap-2">
          {onOpenAiRecommendations && (
            <button
              onClick={onOpenAiRecommendations}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 via-rose-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white shadow-sm transition-all"
              title="Get AI suggested triage and bed allocation moves"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span className="whitespace-nowrap">AI Moves</span>
            </button>
          )}

          <button
            onClick={onTriggerMassCasualty}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
              codeRedActive
                ? 'bg-rose-700 text-white animate-pulse'
                : 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800'
            }`}
            title="Simulate sudden multi-victim trauma disaster"
          >
            <Siren className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">MCI Wave</span>
          </button>

          <button
            onClick={onOpenIntakeModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Admit Patient</span>
          </button>

          {/* Google Sign-in / User Profile */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-800 ml-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-300" title={currentUser.email || ''}>
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Clinician'}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-200">
                    {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                  </div>
                )}
                <span className="hidden xl:inline text-[11px] font-medium max-w-[90px] truncate">
                  {currentUser.displayName || 'Clinician'}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 ml-1"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-400" />
              <span className="whitespace-nowrap">Sign in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
