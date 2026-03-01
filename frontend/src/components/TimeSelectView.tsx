import { useState } from 'react';
import { ChevronRight, Loader2, Dumbbell } from 'lucide-react';
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

export function TimeSelectView({ session, apiBase, onStartMenu }: TimeSelectViewProps) {
    const [isLoading, setIsLoading] = useState(false);

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

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
                <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
                <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Generating Menu...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex justify-between items-center mb-10 pt-4">
                <div>
                    <h1 className="text-3xl font-black italic text-blue-500 uppercase">Workout</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-1">Select Body Part</p>
                </div>
                <Dumbbell className="text-slate-500" size={24} />
            </header>

            <div className="space-y-4">
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

            <p className="text-center text-[10px] text-slate-500 font-bold mt-8 uppercase tracking-wider">
                AI が最適なメニューを自動提案します
            </p>
        </div>
    );
}
