import { useState, useEffect } from 'react';
import { X, Loader2, Save, Video, Lightbulb } from 'lucide-react';
import type { ExerciseMeta, CognitoSession } from '../types';

interface ExerciseDetailModalProps {
    isOpen: boolean;
    exerciseName: string;
    onClose: () => void;
    theme: 'light' | 'dark';
    gymMode: boolean;
    session: CognitoSession | null;
    apiBase: string;
}

export function ExerciseDetailModal({ isOpen, exerciseName, onClose, theme, gymMode, session, apiBase }: ExerciseDetailModalProps) {
    const isDark = theme === 'dark';
    const bgClass = gymMode ? 'bg-[#152232] border-slate-700/50' : (isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200');
    const textMain = isDark ? 'text-white' : 'text-slate-900';
    const textSub = isDark ? 'text-slate-400' : 'text-slate-500';

    const [meta, setMeta] = useState<ExerciseMeta | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Edit states
    const [tips, setTips] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (!isOpen || !session || !exerciseName) return;
        
        const fetchMeta = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${apiBase}/meta/exercise/${encodeURIComponent(exerciseName)}`, {
                    headers: { 'Authorization': `Bearer ${session.getIdToken().getJwtToken()}` }
                });
                if (response.ok) {
                    const data: ExerciseMeta = await response.json();
                    setMeta(data);
                    setTips(data.tips || '');
                    setVideoUrl(data.video_url || '');
                }
            } catch (e) {
                console.error('Failed to fetch meta', e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMeta();
        setIsEditing(false); // Reset to view mode initially
    }, [isOpen, exerciseName, session, apiBase]);

    const handleSave = async () => {
        if (!session) return;
        setIsSaving(true);
        try {
            const payload = { tips, video_url: videoUrl };
            const response = await fetch(`${apiBase}/meta/exercise/${encodeURIComponent(exerciseName)}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.getIdToken().getJwtToken()}` 
                },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const data = await response.json();
                setMeta(data);
                setIsEditing(false);
            }
        } catch (e) {
            console.error('Failed to save meta', e);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300">
            <div className="absolute inset-0 bg-slate-900/80" onClick={onClose} />
            
            <div className={`relative w-full max-w-md p-6 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 border ${bgClass} ${textMain}`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black italic pr-4 break-words leading-tight">{exerciseName}</h2>
                    <button 
                        onClick={onClose}
                        className={`p-2 rounded-full shrink-0 ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {isEditing ? (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSub}`}>Tips & Notes</label>
                                    <textarea 
                                        className={`w-full p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'} outline-none focus:border-blue-500`}
                                        rows={4}
                                        placeholder="フォームの注意点やメモ..."
                                        value={tips}
                                        onChange={e => setTips(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSub}`}>Reference Video URL</label>
                                    <input 
                                        type="url"
                                        className={`w-full p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'} outline-none focus:border-blue-500`}
                                        placeholder="https://youtube.com/..."
                                        value={videoUrl}
                                        onChange={e => setVideoUrl(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={() => setIsEditing(false)}
                                        className={`flex-1 py-3 rounded-xl font-bold border ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className={`p-5 rounded-2xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'} border ${isDark ? 'border-slate-700/30' : 'border-slate-200'}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Lightbulb size={18} className="text-yellow-500" />
                                        <h3 className="font-bold text-sm">Tips</h3>
                                    </div>
                                    <p className={`text-sm whitespace-pre-wrap ${!meta?.tips ? textSub + ' italic' : ''}`}>
                                        {meta?.tips || 'まだメモがありません。'}
                                    </p>
                                </div>

                                {meta?.video_url && (
                                    <div className="flex gap-2">
                                        <a 
                                            href={meta.video_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600/10 text-red-500 hover:bg-red-600/20 font-bold rounded-xl transition-colors"
                                        >
                                            <Video size={18} /> Watch Video
                                        </a>
                                    </div>
                                )}

                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className={`w-full py-4 text-xs font-bold uppercase tracking-widest border-t ${isDark ? 'border-slate-700/50 text-blue-400' : 'border-slate-200 text-blue-600'} hover:opacity-80 transition-opacity`}
                                >
                                    Edit Details
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ExerciseDetailModal;
