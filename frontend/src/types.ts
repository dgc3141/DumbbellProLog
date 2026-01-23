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
