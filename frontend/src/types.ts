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
