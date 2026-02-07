
import { useMemo, useState, useEffect } from 'react';
import { CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Sparkles, AlertTriangle, Lightbulb } from 'lucide-react';
import type { WorkoutSet, AIAnalysisResponse } from '../types';
import PerformanceGraph from './PerformanceGraph';
import { EXERCISES } from '../routines';

interface StatsDashboardProps {
    history: WorkoutSet[];
    theme: 'light' | 'dark';
    session: any;
    onUpdateHistory: (history: WorkoutSet[]) => void;
}

export default function StatsDashboard({ history, theme, session, onUpdateHistory }: StatsDashboardProps) {
    const [selectedExerciseId, setSelectedExerciseId] = useState<string>('db_bench_press');
    const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // 全履歴を取得する
    useEffect(() => {
        const fetchFullHistory = async () => {
            if (!session) return;
            setIsLoadingHistory(true);
            try {
                const response = await fetch('https://md80ui8pz1.execute-api.ap-northeast-1.amazonaws.com/stats/history', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': session.getIdToken().getJwtToken()
                    },
                    body: JSON.stringify({ user_id: session.getUsername() })
                });
                if (response.ok) {
                    const data = await response.json();
                    onUpdateHistory(data);
                }
            } catch (e) {
                console.error('Failed to fetch full history', e);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        fetchFullHistory();
    }, [session]);

    // AI長期分析を取得する
    const fetchAIAnalysis = async () => {
        if (!session || history.length === 0) return;
        setIsAnalyzing(true);
        try {
            const response = await fetch('https://md80ui8pz1.execute-api.ap-northeast-1.amazonaws.com/ai/analyze-growth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': session.getIdToken().getJwtToken()
                },
                body: JSON.stringify({ user_id: session.getUsername() })
            });
            if (response.ok) {
                const data = await response.json();
                setAnalysis(data);
            }
        } catch (e) {
            console.error('AI Analysis failed', e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // 総ボリューム推移
    const volumeData = useMemo(() => {
        const sessions: Record<string, number> = {};
        history.forEach(set => {
            const date = new Date(set.timestamp).toLocaleDateString();
            sessions[date] = (sessions[date] || 0) + (set.weight * set.reps);
        });
        return Object.entries(sessions)
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .map(([date, volume]) => ({ date, volume }))
            .slice(-30); // グラフは最大30回分表示
    }, [history]);

    const chartColor = "#3b82f6";
    const textColor = theme === 'dark' ? '#94a3b8' : '#64748b';

    if (history.length === 0 && !isLoadingHistory) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <p className="text-sm font-black uppercase tracking-widest">No Data Available Yet</p>
                <p className="text-[10px]">Start training to see your progress!</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 種目選択フィルター */}
            <div className="flex flex-col items-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-4">Select Exercise</p>
                <select
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    className={`w-full max-w-xs p-3 rounded-2xl text-sm font-bold appearance-none text-center ${theme === 'dark'
                            ? 'bg-slate-800 border-slate-700 text-slate-200'
                            : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                        } border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                >
                    {Object.values(EXERCISES).map((ex) => (
                        <option key={ex.id} value={ex.id}>
                            {ex.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* 推定1RM成長グラフ */}
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6 text-center">Performance Tracking</p>
                <PerformanceGraph
                    history={history}
                    exerciseId={selectedExerciseId}
                    theme={theme}
                />
            </div>

            {/* AI 分析セクション */}
            <div className={`p-6 rounded-[2rem] ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'} border border-dashed ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`}>
                {!analysis && !isAnalyzing ? (
                    <div className="text-center">
                        <button
                            onClick={fetchAIAnalysis}
                            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-2xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30"
                        >
                            <Sparkles size={18} />
                            AIで長期成長を分析する
                        </button>
                    </div>
                ) : isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-2" />
                        <p className="text-sm text-slate-500">DeepSeekが全履歴を分析中...</p>
                    </div>
                ) : analysis && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-blue-500">
                            <Sparkles size={20} />
                            <h3 className="font-black text-lg">AI GROWTH INSIGHTS</h3>
                        </div>

                        {/* インサイト */}
                        <div className="space-y-3">
                            {analysis.insights.map((insight, i) => (
                                <div key={i} className="flex gap-3">
                                    <Lightbulb className="text-yellow-500 shrink-0" size={18} />
                                    <p className="text-sm">{insight}</p>
                                </div>
                            ))}
                        </div>

                        {/* 警告/プラトー */}
                        {analysis.plateau_warnings.length > 0 && (
                            <div className="space-y-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
                                <div className="flex items-center gap-2 font-black text-xs uppercase">
                                    <AlertTriangle size={14} />
                                    Plateau Warning
                                </div>
                                {analysis.plateau_warnings.map((warn, i) => (
                                    <p key={i} className="text-sm">{warn}</p>
                                ))}
                            </div>
                        )}

                        {/* メッセージ */}
                        <p className="text-sm font-bold italic text-slate-500 border-l-4 border-blue-500 pl-3">
                            "{analysis.encouragement}"
                        </p>

                        <button
                            onClick={() => setAnalysis(null)}
                            className="text-xs text-slate-400 hover:text-blue-500 transition-colors underline"
                        >
                            再分析する
                        </button>
                    </div>
                )}
            </div>

            {/* 総ボリューム推移 */}
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6 text-center">Total Volume History</p>
                <div className={`p-4 rounded-3xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'} border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={volumeData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                                <XAxis dataKey="date" fontSize={8} tick={{ fill: textColor }} axisLine={false} tickLine={false} />
                                <YAxis fontSize={8} tick={{ fill: textColor }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                                    itemStyle={{ color: chartColor }}
                                />
                                <Bar dataKey="volume" fill={chartColor} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
