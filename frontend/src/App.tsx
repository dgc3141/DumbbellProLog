import { useState } from 'react';
import { WorkoutSet, Exercise, RpeLevel } from './types';
import LoggingFlow from './components/LoggingFlow';

export default function App() {
    const [totalVolume, setTotalVolume] = useState(2480);
    const [progress, setProgress] = useState(40);

    const currentExercise: Exercise = {
        id: '1',
        name: 'インクライン・プレス',
        notes: '肩甲骨を寄せて固定'
    };

    const [currentSet, setCurrentSet] = useState(2);
    const totalSets = 3;
    const [weight, setWeight] = useState(24);
    const lastSet = "24kg x 10";

    return (
        <div className="bg-[#0f172a] text-slate-100 min-h-screen flex flex-col items-center p-4 select-none">
            <div className="w-full max-w-md">
                {/* Global Progress */}
                <div className="w-full bg-slate-800 h-1 rounded-full mb-6 overflow-hidden">
                    <div
                        className="bg-blue-500 h-full transition-all duration-500"
                        style={{ width: `${progress}%`, boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}
                    ></div>
                </div>

                {/* Header */}
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-black italic tracking-tighter text-blue-500 uppercase">Push Day</h1>
                        <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em]">JAN 23, 2026 / FRIDAY</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Total Vol</p>
                        <p className="text-lg font-black text-blue-400 leading-none">
                            {totalVolume.toLocaleString()}<span className="text-[10px] ml-1">KG</span>
                        </p>
                    </div>
                </header>

                {/* Exercise Card */}
                <div className="bg-[#1e293b] rounded-[2.5rem] p-7 border border-slate-700/50 shadow-2xl relative overflow-hidden mb-6">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-xl font-black tracking-tight leading-tight">{currentExercise.name}</h2>
                        <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full">30°</span>
                    </div>
                    <div className="flex items-center gap-2 mb-6">
                        <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11H9v2h2V7zm0 4H9v4h2v-4z"></path>
                        </svg>
                        <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest italic">{currentExercise.notes}</p>
                    </div>

                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Weight</p>
                            <div className="flex items-baseline">
                                <span className="text-6xl font-black tracking-tighter">{weight}</span>
                                <span className="text-sm ml-1 font-black italic text-slate-500">KG</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <button
                                onClick={() => setWeight(w => w + 2)}
                                className="bg-slate-800 w-14 h-12 rounded-t-2xl flex items-center justify-center border border-slate-700 active:scale-95 transition-all hover:text-blue-500"
                            >＋</button>
                            <button
                                onClick={() => setWeight(w => Math.max(0, w - 2))}
                                className="bg-slate-800 w-14 h-12 rounded-b-2xl flex items-center justify-center border border-slate-700 active:scale-95 transition-all hover:text-blue-500"
                            >－</button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-slate-800/50">
                        <div>
                            <span className="text-[10px] font-black text-slate-500 uppercase block tracking-widest">Current Set</span>
                            <span className="text-xl font-black text-blue-500">SET {currentSet} / {totalSets}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-slate-500 uppercase block tracking-widest">Last Set</span>
                            <span className="text-xl font-black opacity-40 italic">{lastSet}</span>
                        </div>
                    </div>
                </div>

                {/* Action Area */}
                <div id="action-area" className="min-h-[260px]">
                    <LoggingFlow
                        onLog={(reps, rpe) => {
                            console.log('Logged:', reps, rpe);
                            // Add to history and volume
                            setTotalVolume(v => v + weight * reps);
                            // Move to next set or rest
                        }}
                    />
                </div>

                {/* History Log */}
                <div className="mt-8">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4 ml-1">Session History</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-800/30 p-4 rounded-2xl border-l-4 border-blue-500/50">
                            <div className="flex items-center gap-3">
                                <span className="text-lg">😊</span>
                                <span className="text-xs font-black uppercase tracking-tighter opacity-80">{currentExercise.name}</span>
                            </div>
                            <span className="text-sm font-black text-blue-400 italic">24KG x 12</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
