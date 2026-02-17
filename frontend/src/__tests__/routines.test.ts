import { describe, it, expect } from 'vitest';
import { DEFAULT_TIMED_MENUS, EXERCISES, ROUTINES } from '../routines';

describe('Routines Integrity', () => {
    it('should have valid default timed menus', () => {
        expect(DEFAULT_TIMED_MENUS.length).toBeGreaterThan(0);
        DEFAULT_TIMED_MENUS.forEach(menu => {
            expect(menu.durationMinutes).toBeOneOf([15, 30, 60]);
            expect(menu.bodyPart).toBeOneOf(['push', 'pull', 'legs']);
            expect(menu.exercises.length).toBeGreaterThan(0);
        });
    });

    it('should have valid exercises definition', () => {
        const keys = Object.keys(EXERCISES);
        expect(keys.length).toBeGreaterThan(0);
        keys.forEach(key => {
            const exercise = EXERCISES[key];
            expect(exercise.id).toBe(key);
            expect(exercise.name).not.toBe('');
        });
    });

    it('should have valid routines', () => {
        expect(ROUTINES.length).toBe(3); // Push, Pull, Legs
        ROUTINES.forEach(routine => {
            expect(routine.exercises.length).toBeGreaterThan(0);
        });
    });
});
