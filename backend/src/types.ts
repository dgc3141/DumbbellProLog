export type RpeLevel = 'easy' | 'just' | 'limit';

export interface WorkoutSet {
    user_id: string;
    timestamp: string;
    exercise_id: string;
    weight: number;
    reps: number;
    rpe: RpeLevel;
    expires_at?: number; // DynamoDB TTL
    is_skipped?: boolean;
    skip_reason?: string;
}

export interface ExerciseMeta {
    user_id: string;
    exercise_id: string;
    tips?: string;
    video_url?: string;
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

export interface EndlessMenu {
    bodyPart: string;          // "push" | "pull" | "legs"
    exercises: MenuExercise[];
    generatedAt: string;
    expires_at?: number; // DynamoDB TTL
}

export interface AIInfoResponse {
    modelName: string;
    provider: string;
    modelId: string;
}

export interface GenerateMenusResponse {
    menus: EndlessMenu[];
    generatedCount: number;
}
