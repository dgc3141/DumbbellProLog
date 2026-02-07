import { useState, useEffect } from 'react';
import type { RpeLevel, WorkoutSet } from './types';
import LoggingFlow from './components/LoggingFlow';
import RestTimer from './components/RestTimer';
import StatsDashboard from './components/StatsDashboard';
import RoutineDetail from './components/RoutineDetail';
import LoginView from './components/LoginView';
import { ROUTINES } from './routines';
import { CognitoUserPool } from 'amazon-cognito-identity-js';
import { COGNITO_CONFIG } from './auth-config';
import { LayoutGrid, BarChart2, CheckCircle2, ChevronRight, Moon, Sun } from 'lucide-react';

export default function App() {
  // Global State
  const [history, setHistory] = useState<WorkoutSet[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [view, setView] = useState<'routine_select' | 'routine_detail' | 'training' | 'stats'>('routine_select');

  // Session State
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [weight, setWeight] = useState(24);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [selectedRepsMap, setSelectedRepsMap] = useState<Record<string, number>>({});
  const [totalVolume, setTotalVolume] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const activeRoutine = ROUTINES[selectedRoutineIndex];
  const currentRoutineEntry = activeRoutine.exercises[currentExerciseIndex];
  const currentExercise = currentRoutineEntry?.exercise;
  const totalSetsForCurrent = currentRoutineEntry?.targetSets || 3;

  // Persistence & Initialization
  useEffect(() => {
    const saved = localStorage.getItem('workout_state_v3');
    const savedTheme = localStorage.getItem('app_theme');
    const lastRoutineId = localStorage.getItem('last_routine_id');

    if (saved) {
      try {
        const state = JSON.parse(saved);
        setHistory(state.history || []);
      } catch (e) { console.error(e); }
    }
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
    if (lastRoutineId) {
      const idx = ROUTINES.findIndex(r => r.id === lastRoutineId);
      if (idx !== -1) setSelectedRoutineIndex(idx);
    }

    // Check Cognito Session
    const userPool = new CognitoUserPool({
      UserPoolId: COGNITO_CONFIG.UserPoolId,
      ClientId: COGNITO_CONFIG.ClientId,
    });
    const user = userPool.getCurrentUser();
    if (user) {
      user.getSession((_err: any, session: any) => {
        if (session && session.isValid()) {
          setSession(session);
        }
        setIsAuthLoading(false);
      });
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('workout_state_v3', JSON.stringify({ history }));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  // Handle Routine Select
  const peekRoutine = (index: number) => {
    setSelectedRoutineIndex(index);
    setView('routine_detail');
  };

  // Handle Routine Start
  const startRoutine = (index: number) => {
    setSelectedRoutineIndex(index);
    setCurrentExerciseIndex(0);
    setCurrentSet(1);
    setIsResting(false);
    setIsSessionComplete(false);
    setTotalVolume(0);
    setWeight(ROUTINES[index].exercises[0].defaultWeight);
    setView('training');
    localStorage.setItem('last_routine_id', ROUTINES[index].id);
  };

  const handleLog = async (reps: number, rpe: RpeLevel) => {
    if (!currentExercise || isLoading) return;

    setIsLoading(true);
    vibrate(50); // Short haptic feedback for tap

    const newSet: WorkoutSet = {
      user_id: session.getUsername(),
      timestamp: new Date().toISOString(),
      exercise_id: currentExercise.id,
      weight,
      reps,
      rpe
    };

    try {
      const response = await fetch('https://md80ui8pz1.execute-api.ap-northeast-1.amazonaws.com/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session.getIdToken().getJwtToken()
        },
        body: JSON.stringify(newSet)
      });

      if (!response.ok) throw new Error('Failed to save');

      setHistory(prev => [...prev, newSet]);
      setTotalVolume(v => v + weight * reps);
      setIsResting(true);
      vibrate([50, 30, 50]); // Multi-tap haptic success
      showToast('Log Saved Successfully');
    } catch (e) {
      console.warn(e);
      showToast('Sync Failed - Saved Locally', 'error');
      // Still allow continuation offline
      setHistory(prev => [...prev, newSet]);
      setTotalVolume(v => v + weight * reps);
      setIsResting(true);
    } finally {
      setIsLoading(false);
    }
  };

  const finishRest = () => {
    setIsResting(false);
    if (currentSet < totalSetsForCurrent) {
      setCurrentSet(s => s + 1);
    } else {
      if (currentExerciseIndex < activeRoutine.exercises.length - 1) {
        const nextIdx = currentExerciseIndex + 1;
        setCurrentExerciseIndex(nextIdx);
        setCurrentSet(1);
        setWeight(activeRoutine.exercises[nextIdx].defaultWeight);
      } else {
        setIsSessionComplete(true);
      }
    }
  };

  const lastSet = history
    .filter(h => h.exercise_id === currentExercise?.id)
    .slice(-1)[0];

  const totalSetsInRoutine = activeRoutine.exercises.reduce((acc, ex) => acc + ex.targetSets, 0);
  const setsCompletedPreviousExercises = activeRoutine.exercises
    .slice(0, currentExerciseIndex)
    .reduce((acc, ex) => acc + ex.targetSets, 0);
  const progress = isSessionComplete ? 100 : ((setsCompletedPreviousExercises + (currentSet - 1)) / totalSetsInRoutine) * 100;

  // --- RENDERING ---

  const Layout = ({ children, hideNav = false }: { children: React.ReactNode, hideNav?: boolean }) => (
    <div className={`min-h-screen flex flex-col items-center p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] select-none transition-colors duration-500 ${theme} ${theme === 'dark' ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full font-black text-sm shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${toast.type === 'success' ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.message}
        </div>
      )}

      {/* Logout Button (Top Right) */}
      {session && !hideNav && (
        <button
          onClick={() => {
            const userPool = new CognitoUserPool({ UserPoolId: COGNITO_CONFIG.UserPoolId, ClientId: COGNITO_CONFIG.ClientId });
            userPool.getCurrentUser()?.signOut();
            setSession(null);
            showToast('Logged out');
          }}
          className="fixed top-6 right-6 z-50 p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500"
        >
          <Sun size={18} className="rotate-45" /> {/* Use as a placeholder for logout icon or just a simple button */}
        </button>
      )}

      <div className="w-full max-w-md">
        {children}
      </div>

      {/* Bottom Nav */}
      {!hideNav && (
        <nav className={`fixed bottom-0 left-0 right-0 p-4 border-t glass-card flex justify-around items-center z-50 rounded-t-3xl ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
          <button onClick={() => setView('routine_select')} className={`flex flex-col items-center gap-1 ${view === 'routine_select' || view === 'routine_detail' ? 'text-blue-500' : 'text-slate-500'}`}>
            <LayoutGrid size={20} />
            <span className="text-[10px] font-black uppercase">Routines</span>
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

  if (isAuthLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <Layout hideNav>
        <LoginView theme={theme} onLoginSuccess={(s) => setSession(s)} />
      </Layout>
    );
  }

  if (view === 'routine_select') {
    return (
      <Layout>
        <header className="flex justify-between items-center mb-10 pt-4">
          <h1 className="text-3xl font-black italic text-blue-500">ROUTINES</h1>
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800">
            {theme === 'dark' ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} />}
          </button>
        </header>
        <div className="space-y-4">
          {ROUTINES.map((r, i) => (
            <button key={r.id} onClick={() => peekRoutine(i)} className="w-full glass-card p-6 rounded-3xl border border-slate-700/50 flex justify-between items-center active:scale-[0.98] transition-all text-left">
              <div>
                <p className="text-[10px] font-black uppercase text-blue-500 mb-1">{r.exercises.length} Exercises</p>
                <h2 className="text-xl font-black italic">{r.name}</h2>
              </div>
              <ChevronRight className="text-slate-500" />
            </button>
          ))}
        </div>
      </Layout>
    );
  }

  if (view === 'routine_detail') {
    return (
      <Layout hideNav>
        <RoutineDetail
          routine={activeRoutine}
          theme={theme}
          onBack={() => setView('routine_select')}
          onStart={() => startRoutine(selectedRoutineIndex)}
        />
      </Layout>
    )
  }

  if (view === 'stats') {
    return (
      <Layout>
        <header className="flex justify-between items-center mb-10 pt-4">
          <h1 className="text-3xl font-black italic text-blue-500">GROWTH</h1>
        </header>
        <div className="glass-card p-6 rounded-[2.5rem] border border-slate-700/50">
          <StatsDashboard history={history} theme={theme} />
        </div>
      </Layout>
    );
  }

  if (isSessionComplete) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
          <div className="glass-card p-8 rounded-[3rem] text-center w-full border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.15)]">
            <h1 className="text-4xl font-black italic text-blue-500 mb-2">FINISHED!</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest mb-10">Amazing Session</p>
            <div className="text-6xl font-black mb-1">{totalVolume.toLocaleString()}</div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-12">Total Volume (KG)</div>
            <button onClick={() => setView('routine_select')} className="w-full bg-blue-600 dark:bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
              Return Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Training View Header */}
      <div className={`w-full h-1 rounded-full mb-6 overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
        <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-black italic text-blue-500 uppercase">{activeRoutine.name}</h1>
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
          <h2 className="text-xl font-black leading-tight">{currentExercise?.name}</h2>
          <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full">{currentExerciseIndex + 1}/{activeRoutine.exercises.length}</span>
        </div>
        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest italic mb-6">{currentExercise?.notes}</p>

        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Weight</p>
            <div className="flex items-baseline">
              <span className="text-6xl font-black tracking-tighter">{weight}</span>
              <span className="text-sm ml-1 font-black italic text-slate-500">KG</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => setWeight(w => Math.min(60, w + 2))} className={`w-14 h-12 rounded-t-2xl flex items-center justify-center border active:scale-95 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>＋</button>
            <button onClick={() => setWeight(w => Math.max(2, w - 2))} className={`w-14 h-12 rounded-b-2xl flex items-center justify-center border active:scale-95 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>－</button>
          </div>
        </div>

        <div className={`flex justify-between items-center pt-6 border-t ${theme === 'dark' ? 'border-slate-800/50' : 'border-slate-200'}`}>
          <div className="text-blue-500 font-black">SET {currentSet} / {totalSetsForCurrent}</div>
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
            Last: <span className="text-slate-400">{lastSet ? `${lastSet.weight}kg x ${lastSet.reps}` : '-'}</span>
          </div>
        </div>
      </div>

      {/* Action Area */}
      <div className="min-h-[260px]">
        {isResting ? (
          <RestTimer theme={theme} onSkip={finishRest} onFinish={finishRest} />
        ) : (
          <LoggingFlow
            theme={theme}
            reps={selectedRepsMap[currentExercise?.id || ''] || 10}
            isLoading={isLoading}
            onRepsChange={(reps) => setSelectedRepsMap(prev => ({ ...prev, [currentExercise?.id || '']: reps }))}
            onLog={handleLog}
          />
        )}
      </div>
    </Layout>
  );
}
