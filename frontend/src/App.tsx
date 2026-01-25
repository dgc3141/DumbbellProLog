import { useState, useEffect } from 'react';
import type { Exercise, Routine, RpeLevel, WorkoutSet } from './types';
import LoggingFlow from './components/LoggingFlow';
import RestTimer from './components/RestTimer';

// Mock Data for "Push Day"
const EXERCISES: Record<string, Exercise> = {
  '1': { id: '1', name: 'インクライン・プレス', notes: '30° / 肩甲骨を寄せて固定' },
  '2': { id: '2', name: 'ショルダー・プレス', notes: '背もたれ垂直 / 耳の横まで下ろす' },
  '3': { id: '3', name: 'トライセプス・エクステンション', notes: '肘を固定 / ストレッチ意識' },
  '4': { id: '4', name: 'サイド・レイズ', notes: '小指側を上げる / 反動を使わない' },
};

const PUSH_DAY: Routine = {
  id: 'push_day',
  name: 'Push Day',
  exercises: [
    { exercise: EXERCISES['1'], targetSets: 3, defaultWeight: 24 },
    { exercise: EXERCISES['2'], targetSets: 3, defaultWeight: 16 },
    { exercise: EXERCISES['3'], targetSets: 3, defaultWeight: 12 },
    { exercise: EXERCISES['4'], targetSets: 3, defaultWeight: 8 },
  ]
};

export default function App() {
  // Global State
  const [totalVolume, setTotalVolume] = useState(2480); // Mock starting volume
  const [history, setHistory] = useState<WorkoutSet[]>([]);

  // Session State
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [weight, setWeight] = useState(PUSH_DAY.exercises[0].defaultWeight);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [selectedRepsMap, setSelectedRepsMap] = useState<Record<string, number>>({});

  const currentRoutineEntry = PUSH_DAY.exercises[currentExerciseIndex];
  const currentExercise = currentRoutineEntry?.exercise;
  const totalSetsForCurrent = currentRoutineEntry?.targetSets || 3;

  // Calculate total progress (sets completed / total sets in routine)
  const totalSetsInRoutine = PUSH_DAY.exercises.reduce((acc, ex) => acc + ex.targetSets, 0);
  const setsCompletedPreviousExercises = PUSH_DAY.exercises
    .slice(0, currentExerciseIndex)
    .reduce((acc, ex) => acc + ex.targetSets, 0);
  const totalSetsCompleted = setsCompletedPreviousExercises + (currentSet - 1);
  const progress = isSessionComplete ? 100 : (totalSetsCompleted / totalSetsInRoutine) * 100;

  const lastSet = history
    .filter(h => h.exercise_id === currentExercise?.id)
    .slice(-1)[0];

  // Persistence (Simplified)
  useEffect(() => {
    const saved = localStorage.getItem('workout_state_v2');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setHistory(state.history || []);
        // In a real app, we'd restore exact position, but for now reset to start or keep simple
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('workout_state_v2', JSON.stringify({ history }));
  }, [history]);

  useEffect(() => {
    if (currentRoutineEntry) {
      setWeight(currentRoutineEntry.defaultWeight);
      setCurrentSet(1);
    }
  }, [currentExerciseIndex]);


  const handleLog = (reps: number, rpe: RpeLevel) => {
    if (!currentExercise) return;

    const newSet: WorkoutSet = {
      user_id: 'default',
      timestamp: new Date().toISOString(),
      exercise_id: currentExercise.id,
      weight,
      reps,
      rpe
    };

    setHistory(prev => [...prev, newSet]);
    setTotalVolume(v => v + weight * reps);

    // Quick Save to Backend (Fire and Forget)
    fetch('https://md80ui8pz1.execute-api.ap-northeast-1.amazonaws.com/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSet)
    }).catch(e => console.warn('Backend reachability check failed (expected if offline)', e));

    setIsResting(true);
  };

  const finishRest = () => {
    setIsResting(false);

    if (currentSet < totalSetsForCurrent) {
      setCurrentSet(s => s + 1);
    } else {
      // Exercise Complete
      if (currentExerciseIndex < PUSH_DAY.exercises.length - 1) {
        setCurrentExerciseIndex(i => i + 1);
      } else {
        setIsSessionComplete(true);
      }
    }
  };

  if (isSessionComplete) {
    return (
      <div className="bg-[#0f172a] text-slate-100 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="glass-card p-8 rounded-[2rem] text-center max-w-md w-full border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
          <h1 className="text-4xl font-black italic text-blue-500 mb-2">WORKOUT COMPLETE!</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest mb-8">Good Job</p>
          <div className="text-6xl font-black mb-2">{totalVolume.toLocaleString()}</div>
          <div className="text-sm font-black text-slate-500 uppercase tracking-widest mb-8">Total Volume (KG)</div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-slate-800 border border-slate-700 py-4 rounded-xl font-black uppercase hover:bg-slate-700 transition-colors"
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] text-slate-100 min-h-screen flex flex-col items-center p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] select-none">
      <div className="w-full max-w-md pb-24">
        {/* Global Progress */}
        <div className="w-full bg-slate-800 h-1 rounded-full mb-6 overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-500 will-change-[width]"
            style={{ width: `${progress}%`, boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}
          ></div>
        </div>

        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter text-blue-500 uppercase">{PUSH_DAY.name}</h1>
            <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em]">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()} / {new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Vol</p>
            <p className="text-lg font-black text-blue-400 leading-none">
              {totalVolume.toLocaleString()}<span className="text-[10px] ml-1">KG</span>
            </p>
          </div>
        </header>

        {/* Exercise Card */}
        <div className="glass-card rounded-[2.5rem] p-7 border border-slate-700/50 shadow-2xl relative overflow-hidden mb-6 transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-black tracking-tight leading-tight">{currentExercise?.name}</h2>
            {/* Tag example - could be dynamic later */}
            <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full">{currentExerciseIndex + 1}/{PUSH_DAY.exercises.length}</span>
          </div>
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11H9v2h2V7zm0 4H9v4h2v-4z"></path>
            </svg>
            <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest italic">{currentExercise?.notes}</p>
          </div>

          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Weight</p>
              <div className="flex items-baseline">
                <span className="text-6xl font-black tracking-tighter transition-all">{weight}</span>
                <span className="text-sm ml-1 font-black italic text-slate-500">KG</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setWeight(w => Math.min(32, w + 2))}
                className="bg-slate-800 w-14 h-12 rounded-t-2xl flex items-center justify-center border border-slate-700 active:scale-95 transition-all hover:text-blue-500"
              >＋</button>
              <button
                onClick={() => setWeight(w => Math.max(2, w - 2))}
                className="bg-slate-800 w-14 h-12 rounded-b-2xl flex items-center justify-center border border-slate-700 active:scale-95 transition-all hover:text-blue-500"
              >－</button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-slate-800/50">
            <div>
              <span className="text-[10px] font-black text-slate-500 uppercase block tracking-widest">Current Set</span>
              <span className="text-xl font-black text-blue-500">SET {currentSet} / {totalSetsForCurrent}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-500 uppercase block tracking-widest">Last Set</span>
              <span className="text-xl font-black opacity-40 italic">{lastSet ? `${lastSet.weight}kg x ${lastSet.reps}` : '-'}</span>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div id="action-area" className="min-h-[260px] transition-all">
          {isResting ? (
            <RestTimer
              onSkip={finishRest}
              onFinish={finishRest}
            />
          ) : (
            <LoggingFlow
              reps={selectedRepsMap[currentExercise?.id || ''] || 10}
              onRepsChange={(reps) => setSelectedRepsMap(prev => ({ ...prev, [currentExercise?.id || '']: reps }))}
              onLog={handleLog}
            />
          )}
        </div>

        {/* History Log */}
        <div className="mt-8">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4 ml-1">Session History</h3>
          <div className="space-y-3">
            {history.slice().reverse().map((set, i) => {
              // Find exercise name from ID for history display
              const exName = Object.values(EXERCISES).find(e => e.id === set.exercise_id)?.name || 'Unknown';
              return (
                <div key={i} className="flex justify-between items-center bg-slate-800/30 p-4 rounded-2xl border-l-4 border-blue-500/50">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {set.rpe === 'easy' ? '😊' : set.rpe === 'just' ? '😐' : '😫'}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-tighter opacity-80">
                        {exName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(set.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-blue-400 italic">
                    {set.weight}KG x {set.reps}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
