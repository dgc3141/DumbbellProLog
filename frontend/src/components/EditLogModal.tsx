import { useState } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import type { WorkoutSet, RpeLevel } from '../types';

interface EditLogModalProps {
    set: WorkoutSet;
    theme: 'light' | 'dark';
    onSave: (updatedSet: WorkoutSet) => Promise<void> | void;
    onDelete: (set: WorkoutSet) => Promise<void> | void;
    onClose: () => void;
}

export default function EditLogModal({ set, theme, onSave, onDelete, onClose }: EditLogModalProps) {
    const [weight, setWeight] = useState(set.weight);
    const [reps, setReps] = useState(set.reps);
    const [rpe, setRpe] = useState<RpeLevel>(set.rpe);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({
                ...set,
                weight,
                reps,
                rpe
            });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this log?')) return;
        setIsDeleting(true);
        try {
            await onDelete(set);
            onClose();
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-black text-blue-500 uppercase tracking-tight">Edit Log</h2>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
                                {new Date(set.timestamp).toLocaleString()}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-500/10 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-8">
                        {/* Weight */}
                        <div className="flex flex-col items-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-4">Weight (kg)</p>
                            <div className="flex items-center gap-6">
                                <button onClick={() => setWeight(Math.max(0, parseFloat((weight - 2.5).toFixed(1))))} className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center font-black">-</button>
                                <span className="text-4xl font-black">{weight}</span>
                                <button onClick={() => setWeight(parseFloat((weight + 2.5).toFixed(1)))} className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center font-black">+</button>
                            </div>
                        </div>

                        {/* Reps */}
                        <div className="flex flex-col items-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-4">Reps</p>
                            <div className="flex items-center gap-6">
                                <button onClick={() => setReps(Math.max(1, reps - 1))} className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center font-black">-</button>
                                <span className="text-4xl font-black">{reps}</span>
                                <button onClick={() => setReps(reps + 1)} className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center font-black">+</button>
                            </div>
                        </div>

                        {/* RPE */}
                        <div className="flex flex-col items-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-4">RPE</p>
                            <div className="flex gap-2 w-full">
                                {(['easy', 'just', 'limit'] as RpeLevel[]).map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setRpe(level)}
                                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${rpe === level ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-500/10 text-slate-500'}`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-slate-700/50 mt-12">
                        <button
                            onClick={handleDelete}
                            disabled={isSaving || isDeleting}
                            className={`p-4 rounded-2xl flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'} disabled:opacity-50`}
                        >
                            <Trash2 size={24} className={isDeleting ? 'animate-pulse' : ''} />
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isDeleting}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:active:scale-100"
                        >
                            <Save size={20} className={isSaving ? 'animate-spin' : ''} />
                            {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
