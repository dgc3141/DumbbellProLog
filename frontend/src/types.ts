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
