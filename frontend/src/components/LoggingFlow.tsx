import type { RpeLevel } from '../types';

interface LoggingFlowProps {
    theme?: 'light' | 'dark';
    reps: number;
    isLoading?: boolean;
    onRepsChange: (reps: number) => void;
    onLog: (reps: number, rpe: RpeLevel) => void;
}

export default function LoggingFlow({ theme = 'dark', reps: selectedReps, isLoading = false, onRepsChange, onLog }: LoggingFlowProps) {
    const repsOptions = Array.from({ length: 16 }, (_, i) => i + 1); // 1 to 16 reps

    const rpeOptions: { level: RpeLevel; label: string; icon: string; color: string }[] = [
        { level: 'easy', label: '余裕', icon: '😊', color: 'bg-green-500/20 text-green-400 border-green-500/50' },
        { level: 'just', label: '妥当', icon: '😐', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
        { level: 'limit', label: '限界', icon: '😫', color: 'bg-red-500/20 text-red-400 border-red-500/50' },
    ];

    return (
        <div className={`rounded-[2.5rem] p-8 shadow-2xl border transition-colors ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700/50' : 'bg-white border-slate-200'}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 mb-6 text-center">Select Reps</p>

            <div className="grid grid-cols-4 gap-3 mb-10">
                {repsOptions.map(reps => (
                    <button
                        key={reps}
                        disabled={isLoading}
                        className={`aspect-square rounded-2xl border flex items-center justify-center text-xl font-black transition-all active:scale-90 ${selectedReps === reps
                            ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                            : theme === 'dark'
                                ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => onRepsChange(reps)}
                    >
                        {reps}
                    </button>
                ))}
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 mb-6 text-center">Select RPE</p>

            <div className="grid grid-cols-3 gap-3">
                {rpeOptions.map(option => (
                    <button
                        key={option.level}
                        disabled={isLoading}
                        className={`flex flex-col items-center justify-center p-4 rounded-3xl border transition-all active:scale-95 hover:brightness-125 ${option.color} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => onLog(selectedReps, option.level)}
                    >
                        {isLoading ? (
                            <div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin mb-1" />
                        ) : (
                            <span className="text-2xl mb-1">{option.icon}</span>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest">{isLoading ? 'Saving...' : option.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
