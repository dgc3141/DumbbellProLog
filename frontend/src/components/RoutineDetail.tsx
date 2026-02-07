
import type { Routine } from '../types';
import { ChevronLeft, Play, Dumbbell } from 'lucide-react';

interface RoutineDetailProps {
    routine: Routine;
    theme: 'light' | 'dark';
    onBack: () => void;
    onStart: () => void;
}

export default function RoutineDetail({ routine, theme, onBack, onStart }: RoutineDetailProps) {
    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <header className="flex justify-between items-center mb-8 pt-4">
                <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-blue-500 transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-black italic text-blue-500 uppercase tracking-tight">Routine Info</h1>
                <div className="w-10"></div> {/* Spacer */}
            </header>

            <div className="glass-card p-8 rounded-[2.5rem] border border-slate-700/50 mb-8 overflow-hidden relative">
                <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase text-blue-500 mb-2 tracking-[0.2em]">{routine.exercises.length} Exercises</p>
                    <h2 className="text-4xl font-black italic mb-8">{routine.name}</h2>

                    <div className="space-y-6">
                        {routine.exercises.map((entry, idx) => (
                            <div key={idx} className="flex items-start gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-black text-lg leading-tight mb-1">{entry.exercise.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                        {entry.targetSets} Sets • {entry.defaultWeight}kg Initial
                                    </p>
                                </div>
                                <Dumbbell size={16} className="text-blue-500/30 mt-1" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Decoration */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl"></div>
            </div>

            <button
                onClick={onStart}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(37,99,235,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
                <Play size={20} fill="currentColor" />
                Start Workout
            </button>
        </div>
    );
}
