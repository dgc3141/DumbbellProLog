// PerformanceGraph.tsx - 推定1RMの推移を可視化するコンポーネント

import { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import type { WorkoutSet } from '../types';
import { EXERCISES } from '../routines';
import { calculateEstimated1RM } from '../utils';

interface PerformanceGraphProps {
    history: WorkoutSet[];
    exerciseId: string;
    theme: 'dark' | 'light';
}


export default function PerformanceGraph({ history, exerciseId, theme }: PerformanceGraphProps) {
    // グラフデータの生成
    const data = useMemo(() => {
        // 対象エクササイズのデータを抽出し、日付順にソート
        const filtered = history
            .filter(set => set.exercise_id === exerciseId)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // 日付ごとの最大1RMを算出
        const dailyMaxMap = new Map<string, number>();
        filtered.forEach(set => {
            const date = new Date(set.timestamp).toLocaleDateString();
            const oneRM = calculateEstimated1RM(set.weight, set.reps);
            const currentMax = dailyMaxMap.get(date) || 0;
            if (oneRM > currentMax) {
                dailyMaxMap.set(date, parseFloat(oneRM.toFixed(1)));
            }
        });

        return Array.from(dailyMaxMap.entries()).map(([date, oneRM]) => ({
            date,
            oneRM
        }));
    }, [history, exerciseId]);

    const exerciseName = EXERCISES[exerciseId]?.name || exerciseId;

    if (data.length === 0) {
        return (
            <div className={`p-8 text-center rounded-3xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                <p className="text-slate-500">この種目の推移データがありません。</p>
            </div>
        );
    }

    return (
        <div className={`p-4 rounded-3xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'} border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
            <h3 className="text-sm font-black uppercase text-blue-500 mb-4 px-2">
                {exerciseName} の推定1RM推移 (kg)
            </h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                fontSize: '12px',
                                color: theme === 'dark' ? '#f8fafc' : '#1e293b'
                            }}
                            itemStyle={{ fontWeight: 'bold', color: '#3b82f6' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="oneRM"
                            name="推定1RM"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                            activeDot={{ r: 6, fill: '#2563eb' }}
                            animationDuration={1500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
