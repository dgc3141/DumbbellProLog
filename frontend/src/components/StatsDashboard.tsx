
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import type { WorkoutSet } from '../types';

interface StatsDashboardProps {
    history: WorkoutSet[];
    theme: 'light' | 'dark';
}

export default function StatsDashboard({ history, theme }: StatsDashboardProps) {
    // 1. Volume per Session
    const volumeData = useMemo(() => {
        const sessions: Record<string, number> = {};
        history.forEach(set => {
            const date = new Date(set.timestamp).toLocaleDateString();
            sessions[date] = (sessions[date] || 0) + (set.weight * set.reps);
        });
        return Object.entries(sessions).map(([date, volume]) => ({ date, volume })).slice(-7);
    }, [history]);

    // 2. Max 1RM Trend (Overall or per Exercise - simplified for now)
    const oneRmTrend = useMemo(() => {
        const data: Record<string, number> = {};
        history.forEach(set => {
            const date = new Date(set.timestamp).toLocaleDateString();
            const est1RM = set.weight * (1 + set.reps / 30);
            if (!data[date] || est1RM > data[date]) {
                data[date] = Number(est1RM.toFixed(1));
            }
        });
        return Object.entries(data).map(([date, oneRm]) => ({ date, oneRm })).slice(-7);
    }, [history]);

    const chartColor = "#3b82f6"; // blue-500
    const textColor = theme === 'dark' ? '#94a3b8' : '#64748b'; // slate-400 : slate-500

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 opacity-50">
                <p className="text-sm font-black uppercase tracking-widest">No Data Available Yet</p>
                <p className="text-[10px]">Start training to see your progress!</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6 text-center">Total Volume Trend (7 Days)</p>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={volumeData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
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

            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6 text-center">Estimated 1RM Growth</p>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={oneRmTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                            <XAxis dataKey="date" fontSize={8} tick={{ fill: textColor }} axisLine={false} tickLine={false} />
                            <YAxis fontSize={8} tick={{ fill: textColor }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                            />
                            <Line type="monotone" dataKey="oneRm" stroke={chartColor} strokeWidth={3} dot={{ r: 4, fill: chartColor }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
