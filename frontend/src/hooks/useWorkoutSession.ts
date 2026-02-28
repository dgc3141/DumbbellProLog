import { useState, useCallback, useEffect } from 'react';
import type { RpeLevel, WorkoutSet, AIRecommendation, EndlessMenu, CognitoSession } from '../types';
import { API_BASE } from '../config';

export function useWorkoutSession(session: CognitoSession | null, vibrate: (pattern: number | number[]) => void, showToast: (msg: string, type?: 'success' | 'error') => void) {
    // ローカルストレージから履歴を初期値として読み込む
    const [history, setHistory] = useState<WorkoutSet[]>(() => {
        try {
            const saved = localStorage.getItem('workout_state_v3');
            if (saved) {
                const state = JSON.parse(saved);
                return state.history || [];
            }
        } catch (e) { console.error(e); }
        return [];
    });
    const [activeMenu, setActiveMenu] = useState<EndlessMenu | null>(null);
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [currentSet, setCurrentSet] = useState(1);
    const [isResting, setIsResting] = useState(false);
    const [weight, setWeight] = useState(20);
    const [isSessionComplete, setIsSessionComplete] = useState(false);
    const [selectedRepsMap, setSelectedRepsMap] = useState<Record<string, number>>({});
    const [totalVolume, setTotalVolume] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // AI
    const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [showAiModal, setShowAiModal] = useState(false);

    useEffect(() => {
        localStorage.setItem('workout_state_v3', JSON.stringify({ history }));
    }, [history]);

    const fetchAIRecommendation = useCallback(async () => {
        if (!session) return;
        setIsAiLoading(true);
        setAiError(null);
        setShowAiModal(true);

        try {
            const response = await fetch(`${API_BASE}/ai/recommend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.getIdToken().getJwtToken()}`
                },
                body: JSON.stringify({ user_id: session.getUsername() })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

            const data: AIRecommendation = await response.json();
            setAiRecommendation(data);
            vibrate([50, 30, 100]);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'AI推奨の取得に失敗しました';
            console.error('AI recommendation error:', e);
            setAiError(msg);
        } finally {
            setIsAiLoading(false);
        }
    }, [session, vibrate]);

    const triggerMenuGeneration = useCallback(async () => {
        if (!session) return;
        try {
            await fetch(`${API_BASE}/ai/generate-menus`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.getIdToken().getJwtToken()}`
                },
                body: JSON.stringify({ user_id: session.getUsername() })
            });
        } catch (e) {
            console.warn('Menu generation trigger failed (non-critical):', e);
        }
    }, [session]);

    const startMenu = useCallback((menu: EndlessMenu) => {
        setActiveMenu(menu);
        setCurrentExerciseIndex(0);
        setCurrentSet(1);
        setIsResting(false);
        setIsSessionComplete(false);
        setTotalVolume(0);
        setWeight(menu.exercises[0]?.recommendedWeight || 20);
    }, []);

    const currentMenuExercise = activeMenu?.exercises[currentExerciseIndex];
    const totalSetsForCurrent = currentMenuExercise?.sets || 3;
    const currentRestDuration = currentMenuExercise?.restSeconds || 90;

    const handleLog = useCallback(async (reps: number, rpe: RpeLevel) => {
        if (!currentMenuExercise || isLoading || !session) return;

        setIsLoading(true);
        vibrate(50);

        const newSet: WorkoutSet = {
            user_id: session.getUsername(),
            timestamp: new Date().toISOString(),
            exercise_id: currentMenuExercise.exerciseName,
            weight,
            reps,
            rpe
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(`${API_BASE}/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.getIdToken().getJwtToken()}`
                },
                body: JSON.stringify(newSet),
                signal: controller.signal
            });

            if (!response.ok) throw new Error('Failed to save');

            setHistory(prev => [...prev, newSet]);
            setTotalVolume((v: number) => v + weight * reps);
            setIsResting(true);
            vibrate([50, 30, 50]);
            showToast('Log Saved Successfully');
        } catch (e) {
            console.warn(e);
            showToast('Sync Failed - Saved Locally', 'error');
            setHistory(prev => [...prev, newSet]);
            setTotalVolume((v: number) => v + weight * reps);
            setIsResting(true);
        } finally {
            clearTimeout(timeoutId);
            setIsLoading(false);
        }
    }, [currentMenuExercise, isLoading, session, weight, showToast, vibrate]);

    const finishRest = useCallback(() => {
        if (!activeMenu) return;
        setIsResting(false);
        if (currentSet < totalSetsForCurrent) {
            setCurrentSet((s: number) => s + 1);
        } else {
            if (currentExerciseIndex < activeMenu.exercises.length - 1) {
                const nextIdx = currentExerciseIndex + 1;
                setCurrentExerciseIndex(nextIdx);
                setCurrentSet(1);
                setWeight(activeMenu.exercises[nextIdx].recommendedWeight);
            } else {
                setIsSessionComplete(true);
            }
        }
    }, [activeMenu, currentExerciseIndex, currentSet, totalSetsForCurrent]);

    const skipExercise = useCallback(() => {
        if (!activeMenu) return;
        setIsResting(false);
        if (currentExerciseIndex < activeMenu.exercises.length - 1) {
            const nextIdx = currentExerciseIndex + 1;
            setCurrentExerciseIndex(nextIdx);
            setCurrentSet(1);
            setWeight(activeMenu.exercises[nextIdx].recommendedWeight);
        } else {
            setIsSessionComplete(true);
        }
    }, [activeMenu, currentExerciseIndex]);

    const finishSession = useCallback(() => {
        setIsSessionComplete(true);
        setIsResting(false);
    }, []);

    return {
        history, setHistory,
        activeMenu, setActiveMenu,
        currentExerciseIndex, currentSet,
        isResting, setIsResting,
        weight, setWeight,
        isSessionComplete, setIsSessionComplete,
        selectedRepsMap, setSelectedRepsMap,
        totalVolume, isLoading,

        aiRecommendation, isAiLoading, aiError, showAiModal, setShowAiModal,
        fetchAIRecommendation, triggerMenuGeneration,

        startMenu, handleLog, finishRest, skipExercise, finishSession,
        currentMenuExercise, totalSetsForCurrent, currentRestDuration
    };
}
