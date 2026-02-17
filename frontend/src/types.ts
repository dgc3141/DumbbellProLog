export type RpeLevel = 'easy' | 'just' | 'limit';

export interface WorkoutSet {
    user_id: string;
    timestamp: string;
    exercise_id: string;
    weight: number;
    reps: number;
    rpe: RpeLevel;
}

export interface Exercise {
    id: string;
    name: string;
    notes?: string;
}

export interface RoutineExercise {
    exercise: Exercise;
    targetSets: number;
    defaultWeight: number;
}

export interface Routine {
    id: string;
    name: string;
    exercises: RoutineExercise[];
}

// AI推奨機能の型
export interface ExerciseRecommendation {
    exercise_id: string;
    recommended_weight: number;
    recommended_reps: number;
    comment: string;
}

export interface AIRecommendation {
    recommendations: ExerciseRecommendation[];
    general_advice: string;
}

export interface AIAnalysisResponse {
    insights: string[];
    plateau_warnings: string[];
    encouragement: string;
}

// === 時間ベースメニュー関連の型 ===

export interface MenuExercise {
    exerciseName: string;
    sets: number;
    reps: number;
    recommendedWeight: number;
    restSeconds: number;
    notes: string;
}

export interface TimedMenu {
    bodyPart: string;          // "push" | "pull" | "legs"
    durationMinutes: number;   // 15 | 30 | 60
    exercises: MenuExercise[];
    totalRestSeconds: number;
    generatedAt: string;
}

export interface AIInfoResponse {
    modelName: string;
    provider: string;
    modelId: string;
}

export interface GenerateMenusResponse {
    menus: TimedMenu[];
    generatedCount: number;
}

export type DurationOption = 15 | 30 | 60;
