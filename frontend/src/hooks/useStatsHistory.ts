import { useState, useEffect, useCallback } from 'react';
import type { WorkoutSet, CognitoSession } from '../types';
import { API_BASE } from '../config';

interface UseStatsHistoryResult {
    history: WorkoutSet[];
    isFetching: boolean;
    error: string | null;
    refetch: () => void;
}

export function useStatsHistory(session: CognitoSession | null): UseStatsHistoryResult {
    const [history, setHistory] = useState<WorkoutSet[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        if (!session) return;
        setIsFetching(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/stats/history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.getIdToken().getJwtToken()}`
                },
                body: JSON.stringify({ user_id: session.getIdToken().payload['cognito:username'] })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            const data: WorkoutSet[] = await response.json();
            setHistory(data);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : '履歴の取得に失敗しました';
            setError(msg);
        } finally {
            setIsFetching(false);
        }
    }, [session]);

    // セッションが変わる（ログイン・ユーザー切り替え）たびに再フェッチ
    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    return { history, isFetching, error, refetch: fetchHistory };
}
