import { useState, useEffect } from 'react';
import { Clock, Zap, Timer, Flame, ChevronRight, Loader2, Dumbbell } from 'lucide-react';
import type { DurationOption, TimedMenu } from '../types';
import { DEFAULT_TIMED_MENUS, BODY_PART_LABELS } from '../routines';

interface TimeSelectViewProps {
    theme: 'light' | 'dark';
    session: import('../types').CognitoSession | null;
    apiBase: string;
    onStartMenu: (menu: TimedMenu) => void;
}

const DURATION_OPTIONS: { value: DurationOption; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
    { value: 15, label: '15 min', icon: <Zap size={28} />, desc: 'クイック・バーン', color: 'from-emerald-500 to-teal-600' },
    { value: 30, label: '30 min', icon: <Timer size={28} />, desc: 'バランス・セッション', color: 'from-blue-500 to-indigo-600' },
    { value: 60, label: '60 min', icon: <Flame size={28} />, desc: 'フル・トレーニング', color: 'from-orange-500 to-red-600' },
];

export function TimeSelectView({ theme, session, apiBase, onStartMenu }: TimeSelectViewProps) {
    const [selectedDuration, setSelectedDuration] = useState<DurationOption | null>(null);
    const [menus, setMenus] = useState<TimedMenu[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (selectedDuration === null) return;

        const fetchMenus = async () => {
            if (!session) {
                // セッションなしの場合はデフォルトメニューを使用
                setMenus(DEFAULT_TIMED_MENUS.filter(m => m.durationMinutes === selectedDuration));
                return;
            }

            setIsLoading(true);
            try {
                const response = await fetch(`${apiBase}/menus/by-duration`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.getIdToken().getJwtToken()}`,
                    },
                    body: JSON.stringify({
                        userId: session.getUsername(),
                        durationMinutes: selectedDuration,
                    }),
                });

                if (response.ok) {
                    const data: TimedMenu[] = await response.json();
                    if (data.length > 0) {
                        setMenus(data);
                    } else {
                        // AI生成メニューがなければフォールバック
                        setMenus(DEFAULT_TIMED_MENUS.filter(m => m.durationMinutes === selectedDuration));
                    }
                } else {
                    setMenus(DEFAULT_TIMED_MENUS.filter(m => m.durationMinutes === selectedDuration));
                }
            } catch {
                setMenus(DEFAULT_TIMED_MENUS.filter(m => m.durationMinutes === selectedDuration));
            } finally {
                setIsLoading(false);
            }
        };

        fetchMenus();
    }, [selectedDuration, session, apiBase]);

    // === 時間選択画面 ===
    if (selectedDuration === null) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="flex justify-between items-center mb-10 pt-4">
                    <div>
                        <h1 className="text-3xl font-black italic text-blue-500">WORKOUT</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-1">Select Duration</p>
                    </div>
                    <Clock className="text-slate-500" size={24} />
                </header>

                <div className="space-y-4">
                    {DURATION_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setSelectedDuration(opt.value)}
                            className="w-full group active:scale-[0.97] transition-all duration-200"
                        >
                            <div className={`relative overflow-hidden rounded-3xl p-6 bg-gradient-to-r ${opt.color} shadow-xl`}>
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/20 rounded-2xl p-3 backdrop-blur-sm">
                                            {opt.icon}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-3xl font-black text-white tracking-tight">{opt.label}</p>
                                            <p className="text-white/70 text-xs font-bold uppercase tracking-wider">{opt.desc}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-white/60 group-hover:text-white transition-colors" size={28} />
                                </div>
                                {/* Background decoration */}
                                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                                <div className="absolute -top-4 -left-4 w-20 h-20 bg-white/5 rounded-full blur-xl" />
                            </div>
                        </button>
                    ))}
                </div>

                <p className="text-center text-[10px] text-slate-500 font-bold mt-8 uppercase tracking-wider">
                    AI が最適なメニューを自動提案します
                </p>
            </div>
        );
    }

    // === メニュー一覧画面（時間選択後） ===
    const durationConfig = DURATION_OPTIONS.find(o => o.value === selectedDuration);

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <header className="flex items-center gap-3 mb-8 pt-4">
                <button
                    onClick={() => setSelectedDuration(null)}
                    className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
                >
                    <ChevronRight size={18} className="rotate-180" />
                </button>
                <div>
                    <h1 className="text-2xl font-black italic text-blue-500">{selectedDuration} MIN MENUS</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{durationConfig?.desc}</p>
                </div>
            </header>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 size={32} className="text-blue-500 animate-spin mb-3" />
                    <p className="text-sm text-slate-500 font-bold">メニューを取得中...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {menus.map((menu, i) => {
                        const partLabel = BODY_PART_LABELS[menu.bodyPart] || menu.bodyPart;
                        const totalSets = menu.exercises.reduce((acc, ex) => acc + ex.sets, 0);

                        return (
                            <button
                                key={`${menu.bodyPart}-${i}`}
                                onClick={() => onStartMenu(menu)}
                                className={`w-full text-left p-6 rounded-3xl border transition-all active:scale-[0.97] ${theme === 'dark'
                                    ? 'glass-card border-slate-700/50 hover:border-blue-500/30'
                                    : 'bg-white border-slate-200 hover:border-blue-400 shadow-sm'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl ${menu.bodyPart === 'push' ? 'bg-red-500/10 text-red-400' :
                                            menu.bodyPart === 'pull' ? 'bg-blue-500/10 text-blue-400' :
                                                'bg-green-500/10 text-green-400'
                                            }`}>
                                            <Dumbbell size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg">{partLabel}</h3>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase">
                                                {menu.exercises.length} exercises · {totalSets} sets
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-slate-500" size={20} />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {menu.exercises.map((ex, j) => (
                                        <span key={j} className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {ex.exerciseName}
                                        </span>
                                    ))}
                                </div>
                                {menu.generatedAt && (
                                    <p className="text-[9px] text-slate-600 mt-2 uppercase tracking-wider">
                                        ✨ AI Generated
                                    </p>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
