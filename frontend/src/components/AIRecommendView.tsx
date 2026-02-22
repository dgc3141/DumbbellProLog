// AIRecommendView.tsx - AI推奨値表示コンポーネント
// トレーニング完了後に自動表示されるモーダル/ビュー

import { X, Sparkles, TrendingUp, MessageSquare } from 'lucide-react';
import type { AIRecommendation } from '../types';
import { EXERCISES } from '../routines';
import { Skeleton } from './ui/Skeleton';
interface AIRecommendViewProps {
    recommendation: AIRecommendation | null;
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
    theme: 'dark' | 'light';
}

export default function AIRecommendView({
    recommendation,
    isLoading,
    error,
    onClose,
    theme,
}: AIRecommendViewProps) {
    // エクササイズIDから日本語名を取得
    const getExerciseName = (exerciseId: string): string => {
        return EXERCISES[exerciseId]?.name || exerciseId;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md rounded-3xl p-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} shadow-2xl max-h-[80vh] overflow-y-auto`}>
                {/* ヘッダー */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-yellow-500" size={24} />
                        <h2 className="text-xl font-black">AI COACH</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ローディング状態 */}
                {isLoading && (
                    <div className="space-y-4 py-8">
                        <Skeleton className="h-6 w-48 mb-6" theme={theme} />
                        <Skeleton className="h-24 w-full rounded-2xl" theme={theme} />
                        <Skeleton className="h-24 w-full rounded-2xl" theme={theme} />
                        <Skeleton className="h-16 w-full rounded-xl mt-4" theme={theme} />
                    </div>
                )}

                {/* エラー状態 */}
                {error && !isLoading && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400">
                        <p className="font-bold mb-1">エラーが発生しました</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* 推奨値表示 */}
                {recommendation && !isLoading && (
                    <>
                        {/* 個別エクササイズの推奨 */}
                        {recommendation.recommendations.length > 0 && (
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-sm font-black text-blue-500 uppercase">
                                    <TrendingUp size={16} />
                                    次回の推奨値
                                </div>
                                {recommendation.recommendations.map((rec, index) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}
                                    >
                                        <div className="font-bold mb-2">
                                            {getExerciseName(rec.exercise_id)}
                                        </div>
                                        <div className="flex gap-4 mb-2">
                                            <div className="flex-1 text-center">
                                                <div className="text-2xl font-black text-blue-500">
                                                    {rec.recommended_weight}
                                                    <span className="text-sm text-slate-500 ml-1">kg</span>
                                                </div>
                                                <div className="text-[10px] uppercase text-slate-500">重量</div>
                                            </div>
                                            <div className="flex-1 text-center">
                                                <div className="text-2xl font-black text-green-500">
                                                    {rec.recommended_reps}
                                                    <span className="text-sm text-slate-500 ml-1">reps</span>
                                                </div>
                                                <div className="text-[10px] uppercase text-slate-500">回数</div>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-500">{rec.comment}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 全体アドバイス */}
                        {recommendation.general_advice && (
                            <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                <div className="flex items-center gap-2 text-sm font-black text-purple-500 uppercase mb-2">
                                    <MessageSquare size={16} />
                                    アドバイス
                                </div>
                                <p className="text-sm">{recommendation.general_advice}</p>
                            </div>
                        )}

                        {/* 履歴がない場合 */}
                        {recommendation.recommendations.length === 0 && (
                            <div className="text-center py-8 text-slate-500">
                                <p>トレーニング履歴がまだありません。</p>
                                <p className="text-sm mt-2">トレーニングを記録すると、AIが次回の推奨値を提案します。</p>
                            </div>
                        )}
                    </>
                )}

                {/* 閉じるボタン */}
                <button
                    onClick={onClose}
                    className="w-full mt-6 py-3 rounded-2xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors"
                >
                    閉じる
                </button>
            </div>
        </div>
    );
}
