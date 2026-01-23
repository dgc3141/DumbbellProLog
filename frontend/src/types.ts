export type RpeLevel = 'easy' | 'just' | 'limit';

export interface WorkoutSet {
    userId: string;
    timestamp: string;
    exerciseId: string;
    weight: number;
    reps: number;
    rpe: RpeLevel;
}

export interface Exercise {
    id: string;
    name: string;
    notes?: string;
}
