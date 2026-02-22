/**
 * Brzycki式を用いた推定1RMの計算
 * 1RM = Weight * (36 / (37 - Reps))
 * ※Repsが10回以下で精度が高いとされる
 */
export const calculateEstimated1RM = (weight: number, reps: number): number => {
    if (reps <= 0) return 0;
    if (reps === 1) return weight;
    return weight * (36 / (37 - reps));
};
