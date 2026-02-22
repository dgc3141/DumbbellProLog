import { useState, useEffect, useCallback } from 'react';
import type { TimedMenu } from './types';
import LoggingFlow from './components/LoggingFlow';
import RestTimer from './components/RestTimer';
import StatsDashboard from './components/StatsDashboard';
import LoginView from './components/LoginView';
import SettingsView from './components/SettingsView';
import AIRecommendView from './components/AIRecommendView';
import { TimeSelectView } from './components/TimeSelectView';
import { LayoutGrid, BarChart2, CheckCircle2, Moon, Sun, Settings, LogOut } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Skeleton } from './components/ui/Skeleton';
import { useAuth, useWorkoutSession } from './hooks';

const API_BASE = 'https://md80ui8pz1.execute-api.ap-northeast-1.amazonaws.com';

const Layout = ({
  children,
  hideNav = false,
  theme,
  toast,
  session,
  view,
  setView,
  setTheme,
  logout,
  showToast
}: {
  children: React.ReactNode,
  hideNav?: boolean,
  theme: 'light' | 'dark',
  toast: { message: string, type: 'success' | 'error' } | null,
  session: any,
  view: string,
  setView: (v: any) => void,
  setTheme: (t: any) => void,
  logout?: () => void,
  showToast?: (m: string) => void
}) => (
  <div className={`min-h-screen flex flex-col items-center p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] select-none transition-colors duration-500 ${theme} ${theme === 'dark' ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
    {/* Toast Notification */}
    {toast && (
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full font-black text-sm shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${toast.type === 'success' ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'}`}>
        {toast.message}
      </div>
    )}

    {/* Header Buttons (Top Right) */}
    {session && !hideNav && (
      <div className="fixed top-6 right-6 z-50 flex gap-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-colors shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700"
        >
          {theme === 'dark' ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} />}
        </button>
        <button
          onClick={() => setView('settings')}
          className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-colors shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700"
        >
          <Settings size={18} />
        </button>
        <button
          onClick={() => {
            if (logout) logout();
            if (showToast) showToast('Logged out');
          }}
          className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-500 transition-colors shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700"
        >
          <LogOut size={18} />
        </button>
      </div>
    )}

    <div className="w-full max-w-md">
      {children}
    </div>

    {/* Bottom Nav */}
    {!hideNav && (
      <nav className={`fixed bottom-0 left-0 right-0 p-4 border-t glass-card flex justify-around items-center z-50 rounded-t-3xl ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
        <button onClick={() => setView('time_select')} className={`flex flex-col items-center gap-1 ${view === 'time_select' ? 'text-blue-500' : 'text-slate-500'}`}>
          <LayoutGrid size={20} />
          <span className="text-[10px] font-black uppercase">Menu</span>
        </button>
        <button onClick={() => setView('training')} className={`flex flex-col items-center gap-1 ${view === 'training' ? 'text-blue-500' : 'text-slate-500'}`}>
          <CheckCircle2 size={20} />
          <span className="text-[10px] font-black uppercase">Session</span>
        </button>
        <button onClick={() => setView('stats')} className={`flex flex-col items-center gap-1 ${view === 'stats' ? 'text-blue-500' : 'text-slate-500'}`}>
          <BarChart2 size={20} />
          <span className="text-[10px] font-black uppercase">Stats</span>
        </button>
      </nav>
    )}
  </div>
);

export default function App() {
  // Global State
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [view, setView] = useState<'time_select' | 'training' | 'stats' | 'settings'>('time_select');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const { session, setSession, isAuthLoading, logout } = useAuth();
  const {
    history, setHistory,
    activeMenu, setActiveMenu,
    currentExerciseIndex, currentSet,
    isResting,
    weight, setWeight,
    isSessionComplete,
    selectedRepsMap, setSelectedRepsMap,
    totalVolume, isLoading,

    aiRecommendation, isAiLoading, aiError, showAiModal, setShowAiModal,
    fetchAIRecommendation, triggerMenuGeneration,

    startMenu, handleLog, finishRest,
    currentMenuExercise, totalSetsForCurrent, currentRestDuration
  } = useWorkoutSession(session, vibrate, showToast);

  // Persistence & Initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTimeout(() => setTheme(savedTheme), 0);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  // トレーニング完了時にAI推奨を自動取得 & メニュー再生成トリガー & Confetti 🎉
  useEffect(() => {
    if (isSessionComplete && session) {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444']
      });
      fetchAIRecommendation();
      triggerMenuGeneration();
    }
  }, [isSessionComplete, session, fetchAIRecommendation, triggerMenuGeneration]);

  const startMenuHandler = (menu: TimedMenu) => {
    startMenu(menu);
    setView('training');
  };

  const lastSet = history
    .filter((h: any) => h.exercise_id === currentMenuExercise?.exerciseName)
    .slice(-1)[0];

  const totalSetsInMenu = activeMenu?.exercises.reduce((acc, ex) => acc + ex.sets, 0) || 0;
  const setsCompletedPreviousExercises = activeMenu?.exercises
    .slice(0, currentExerciseIndex)
    .reduce((acc, ex) => acc + ex.sets, 0) || 0;
  const progress = isSessionComplete ? 100 : totalSetsInMenu > 0 ? ((setsCompletedPreviousExercises + (currentSet - 1)) / totalSetsInMenu) * 100 : 0;

  // --- RENDERING ---

  if (isAuthLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
        <div className="w-full max-w-sm space-y-6">
          <Skeleton className="h-48 w-full rounded-3xl" theme={theme} />
          <div className="space-y-4">
            <Skeleton className="h-16 w-full rounded-2xl" theme={theme} />
            <Skeleton className="h-16 w-full rounded-2xl" theme={theme} />
            <Skeleton className="h-16 w-full rounded-2xl" theme={theme} />
          </div>
          <div className="flex justify-center pt-8">
            <Skeleton className="h-8 w-32 rounded-full" theme={theme} />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Layout hideNav theme={theme} toast={toast} session={session} view={view} setView={setView} setTheme={setTheme} logout={logout} showToast={showToast}>
        <LoginView theme={theme} onLoginSuccess={(s) => setSession(s)} />
      </Layout>
    );
  }

  if (view === 'time_select') {
    return (
      <Layout theme={theme} toast={toast} session={session} view={view} setView={setView} setTheme={setTheme} logout={logout} showToast={showToast}>
        <TimeSelectView
          theme={theme}
          session={session}
          apiBase={API_BASE}
          onStartMenu={startMenuHandler}
        />
      </Layout>
    );
  }

  if (view === 'stats') {
    return (
      <Layout theme={theme} toast={toast} session={session} view={view} setView={setView} setTheme={setTheme} logout={logout} showToast={showToast}>
        <header className="flex justify-between items-center mb-10 pt-4">
          <h1 className="text-3xl font-black italic text-blue-500">GROWTH</h1>
        </header>
        <div className="glass-card p-6 rounded-[2.5rem] border border-slate-700/50">
          <StatsDashboard
            history={history}
            theme={theme}
            session={session}
            onUpdateHistory={(newHistory) => setHistory(newHistory)}
          />
        </div>
      </Layout>
    );
  }

  if (view === 'settings') {
    return (
      <Layout theme={theme} toast={toast} session={session} view={view} setView={setView} setTheme={setTheme} logout={logout} showToast={showToast}>
        <SettingsView
          theme={theme}
          session={session}
          apiBase={API_BASE}
          onBack={() => setView('time_select')}
        />
      </Layout>
    );
  }

  // === Training View ===

  if (!activeMenu) {
    return (
      <Layout theme={theme} toast={toast} session={session} view={view} setView={setView} setTheme={setTheme} logout={logout} showToast={showToast}>
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
          <div className="glass-card p-8 rounded-[3rem] text-center w-full border border-slate-700/50">
            <h1 className="text-2xl font-black italic text-blue-500 mb-4">NO ACTIVE SESSION</h1>
            <p className="text-slate-400 mb-8">メニューを選択してトレーニングを開始しましょう</p>
            <button
              onClick={() => setView('time_select')}
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              Select Menu
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (isSessionComplete) {
    return (
      <Layout theme={theme} toast={toast} session={session} view={view} setView={setView} setTheme={setTheme} logout={logout} showToast={showToast}>
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
          <div className="glass-card p-8 rounded-[3rem] text-center w-full border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.15)]">
            <h1 className="text-4xl font-black italic text-blue-500 mb-2">FINISHED!</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest mb-10">Amazing Session</p>
            <div className="text-6xl font-black mb-1">{totalVolume.toLocaleString()}</div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-12">Total Volume (KG)</div>
            <button onClick={() => { setActiveMenu(null); setView('time_select'); }} className="w-full bg-blue-600 dark:bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
              Return Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout theme={theme} toast={toast} session={session} view={view} setView={setView} setTheme={setTheme} logout={logout} showToast={showToast}>
      {/* Training View Header */}
      <div className={`w-full h-1 rounded-full mb-6 overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
        <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-black italic text-blue-500 uppercase">
            {activeMenu.bodyPart.toUpperCase()} · {activeMenu.durationMinutes}MIN
          </h1>
          <p className="text-[10px] font-bold text-slate-500">{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase()}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Current Vol</p>
          <p className="text-lg font-black text-blue-400">{totalVolume.toLocaleString()} <span className="text-[10px]">KG</span></p>
        </div>
      </header>

      {/* Exercise Card */}
      <div className="glass-card rounded-[2.5rem] p-7 border border-slate-700/50 shadow-2xl relative mb-6">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-xl font-black leading-tight">{currentMenuExercise?.exerciseName}</h2>
          <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full">{currentExerciseIndex + 1}/{activeMenu.exercises.length}</span>
        </div>
        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest italic mb-6">{currentMenuExercise?.notes}</p>

        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Weight</p>
            <div className="flex items-baseline">
              <span className="text-6xl font-black tracking-tighter">{weight}</span>
              <span className="text-sm ml-1 font-black italic text-slate-500">KG</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => setWeight((w: number) => Math.min(60, w + 2))} className={`w-14 h-12 rounded-t-2xl flex items-center justify-center border active:scale-95 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>＋</button>
            <button onClick={() => setWeight((w: number) => Math.max(2, w - 2))} className={`w-14 h-12 rounded-b-2xl flex items-center justify-center border active:scale-95 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>－</button>
          </div>
        </div>

        <div className={`flex justify-between items-center pt-6 border-t ${theme === 'dark' ? 'border-slate-800/50' : 'border-slate-200'}`}>
          <div className="text-blue-500 font-black">SET {currentSet} / {totalSetsForCurrent}</div>
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
            Last: <span className="text-slate-400">{lastSet ? `${lastSet.weight}kg x ${lastSet.reps}` : '-'}</span>
          </div>
        </div>

        {/* レスト時間表示 */}
        <div className={`mt-3 text-center text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
          Rest: {currentRestDuration}s (AI最適化)
        </div>
      </div>

      {/* Action Area */}
      <div className="min-h-[260px]">
        {isResting ? (
          <RestTimer theme={theme} duration={currentRestDuration} onSkip={finishRest} onFinish={finishRest} />
        ) : (
          <LoggingFlow
            theme={theme}
            reps={selectedRepsMap[currentMenuExercise?.exerciseName || ''] || (currentMenuExercise?.reps || 10)}
            isLoading={isLoading}
            onRepsChange={(reps: number) => setSelectedRepsMap((prev: any) => ({ ...prev, [currentMenuExercise?.exerciseName || '']: reps }))}
            onLog={handleLog}
          />
        )}
      </div>

      {/* AI推奨モーダル */}
      {showAiModal && (
        <AIRecommendView
          recommendation={aiRecommendation}
          isLoading={isAiLoading}
          error={aiError}
          onClose={() => setShowAiModal(false)}
          theme={theme}
        />
      )}
    </Layout>
  );
}
