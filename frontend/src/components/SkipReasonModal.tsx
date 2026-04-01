import { X } from 'lucide-react';

interface SkipReasonModalProps {
    onSelect: (reason: string) => void;
    onCancel: () => void;
    theme: 'light' | 'dark';
}

const SKIP_REASONS = [
    { id: 'Fatigue', label: '疲労 (Fatigue)' },
    { id: 'Time insufficient', label: '時間不足 (Time insufficient)' },
    { id: 'Equipment busy', label: '器具の混雑 (Equipment busy)' },
    { id: 'Injury', label: '怪我 (Injury)' },
    { id: 'Other', label: 'その他 (Other)' },
];

export function SkipReasonModal({ onSelect, onCancel, theme }: SkipReasonModalProps) {
    const isDark = theme === 'dark';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300">
            <div className="absolute inset-0 bg-slate-900/80" onClick={onCancel} />
            
            <div className={`relative w-full max-w-sm p-6 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 border ${isDark ? 'bg-slate-800 border-slate-700/50 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black italic">SKIP REASON</h2>
                    <button 
                        onClick={onCancel}
                        className={`p-2 rounded-full ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <p className={`text-xs mb-6 font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    スキップする理由を教えてください
                </p>

                <div className="space-y-3">
                    {SKIP_REASONS.map(reason => (
                        <button
                            key={reason.id}
                            onClick={() => onSelect(reason.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all active:scale-95 border ${
                                isDark 
                                ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600' 
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            <span>{reason.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SkipReasonModal;
