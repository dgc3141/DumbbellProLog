import { useState } from 'react';
import { ChevronRight, Loader2, Dumbbell, Zap } from 'lucide-react';
import type { EndlessMenu } from '../types';
import { DEFAULT_ENDLESS_MENUS } from '../routines';

interface TimeSelectViewProps {
    session: import('../types').CognitoSession | null;
    apiBase: string;
    onStartMenu: (menu: EndlessMenu) => void;
}

const BODY_PARTS: { value: string; label: string; desc: string; color: string }[] = [
    { value: 'push', label: 'Push', desc: '胸・肩・三頭筋', color: 'from-orange-500 to-red-600' },
    { value: 'pull', label: 'Pull', desc: '背中・二頭筋', color: 'from-blue-500 to-indigo-600' },
    { value: 'legs', label: 'Legs', desc: '脚・腹・肩', color: 'from-emerald-500 to-teal-600' },
];

const SPOT_EXERCISES = [
    { id: 'push_4', name: 'サイド・レイズ', bodyPart: 'push', defaultWeight: 8, reps: 15, notes: '反動を使わない' },
    { id: 'pull_3', name: 'ハンマー・カール', bodyPart: 'pull', defaultWeight: 12, reps: 12, notes: '前腕を固定' },
    { id: 'legs_3', name: 'カーフレイズ', bodyPart: 'legs', defaultWeight: 18, reps: 20, notes: '最大ストレッチ' },
];

export function TimeSelectView({ session, apiBase, onStartMenu }: TimeSelectViewProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [spotSets, setSpotSets] = useState<number>(2);

    const handleSelectBodyPart = async (bodyPart: string) => {
        if (!session) {
            const fallback = DEFAULT_ENDLESS_MENUS.find(m => m.bodyPart === bodyPart);
            if (fallback) onStartMenu(fallback);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${apiBase}/menus/by-body-part`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.getIdToken().getJwtToken()}`,
                },
                body: JSON.stringify({
                    userId: session.getIdToken().payload['cognito:username'],
                    bodyPart,
                }),
            });

            if (response.ok) {
                const data: EndlessMenu[] = await response.json();
                if (data.length > 0) {
                    onStartMenu(data[0]); // 最初に見つかったメニューを返す
                } else {
                    const fallback = DEFAULT_ENDLESS_MENUS.find(m => m.bodyPart === bodyPart);
                    if (fallback) onStartMenu(fallback);
                }
            } else {
                const fallback = DEFAULT_ENDLESS_MENUS.find(m => m.bodyPart === bodyPart);
                if (fallback) onStartMenu(fallback);
            }
        } catch {
            const fallback = DEFAULT_ENDLESS_MENUS.find(m => m.bodyPart === bodyPart);
            if (fallback) onStartMenu(fallback);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartSpot = (exercise: typeof SPOT_EXERCISES[0]) => {
        const spotMenu: EndlessMenu = {
            bodyPart: exercise.bodyPart,
            generatedAt: new Date().toISOString(),
            exercises: [{
                exerciseName: exercise.name,
                sets: spotSets,
                reps: exercise.reps,
                recommendedWeight: exercise.defaultWeight,
                restSeconds: 60,
                notes: exercise.notes
            }]
        };
        onStartMenu(spotMenu);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
                <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
                <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Generating Menu...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <header className="flex justify-between items-center mb-8 pt-4">
                <div>
                    <h1 className="text-3xl font-black italic text-blue-500 uppercase">Workout</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-1">Select Body Part</p>
                </div>
                <Dumbbell className="text-slate-500" size={24} />
            </header>

            <div className="space-y-4 mb-10">
                {BODY_PARTS.map((part) => (
                    <button
                        key={part.value}
                        onClick={() => handleSelectBodyPart(part.value)}
                        className="w-full group active:scale-[0.97] transition-all duration-200 block text-left"
                    >
                        <div className={`relative overflow-hidden rounded-3xl p-6 bg-gradient-to-r ${part.color} shadow-xl`}>
                            <div className="flex items-center justify-between relative z-10">
                                <div className="text-left">
                                    <p className="text-3xl font-black text-white tracking-tight italic uppercase">{part.label}</p>
                                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">{part.desc}</p>
                                </div>
                                <div className="bg-white/20 rounded-full p-2 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                                    <ChevronRight className="text-white" size={24} />
                                </div>
                            </div>
                            {/* Background decoration */}
                            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                            <div className="absolute -top-4 -left-4 w-20 h-20 bg-white/5 rounded-full blur-xl" />
                        </div>
                    </button>
                ))}
            </div>

            {/* Spot Training Section */}
            <div className="mt-12">
                <header className="flex justify-between items-end mb-4 px-2">
                    <div className="flex items-center gap-2">
                        <Zap className="text-yellow-500" size={20} />
                        <h2 className="text-lg font-black italic text-slate-700 dark:text-slate-300 uppercase">Spot Training</h2>
                    </div>
                </header>

                <div className="glass-card p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Sets</label>
                        <div className="flex bg-slate-200 dark:bg-slate-800 rounded-xl p-1">
                            {[1, 2, 3, 4].map(num => (
                                <button
                                    key={num}
                                    onClick={() => setSpotSets(num)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-black transition-all ${spotSets === num ? 'bg-white dark:bg-slate-600 text-blue-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 text-right pr-1">短時間で1種目だけ行うメニューを作成します</p>
                </div>

                <div className="space-y-3">
                    {SPOT_EXERCISES.map((ex) => (
                        <button
                            key={ex.id}
                            onClick={() => handleStartSpot(ex)}
                            className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all active:scale-[0.98]"
                        >
                            <div className="text-left flex flex-col">
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{ex.name}</span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{ex.bodyPart} • {ex.defaultWeight}kg x {ex.reps}</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <ChevronRight size={16} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

        </div>
    );
}
