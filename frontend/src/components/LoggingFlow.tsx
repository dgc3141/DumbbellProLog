import type { RpeLevel } from '../types';

interface LoggingFlowProps {
    reps: number;
    onRepsChange: (reps: number) => void;
    onLog: (reps: number, rpe: RpeLevel) => void;
}

export default function LoggingFlow({ reps: selectedReps, onRepsChange, onLog }: LoggingFlowProps) {
    const repsOptions = Array.from({ length: 8 }, (_, i) => i + 8); // 8 to 15 reps

    const rpeOptions: { level: RpeLevel; label: string; icon: string; color: string }[] = [
        { level: 'easy', label: '余裕', icon: '😊', color: 'bg-green-500/20 text-green-400 border-green-500/50' },
        { level: 'just', label: '妥当', icon: '😐', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
        { level: 'limit', label: '限界', icon: '😫', color: 'bg-red-500/20 text-red-400 border-red-500/50' },
    ];

    return (
        <div className="bg-[#1e293b] rounded-[2.5rem] p-8 shadow-2xl border border-slate-700/50">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 mb-6 text-center">Select Reps</p>

            <div className="grid grid-cols-4 gap-3 mb-10">
                {repsOptions.map(reps => (
                    <button
                        key={reps}
                        className={`aspect-square rounded-2xl border flex items-center justify-center text-xl font-black transition-all active:scale-90 ${selectedReps === reps
                            ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
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
                        className={`flex flex-col items-center justify-center p-4 rounded-3xl border ${option.color} transition-all active:scale-95 hover:brightness-125`}
                        onClick={() => onLog(selectedReps, option.level)}
                    >
                        <span className="text-2xl mb-1">{option.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{option.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
