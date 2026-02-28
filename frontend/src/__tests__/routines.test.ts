import { describe, it, expect } from 'vitest';
import { DEFAULT_ENDLESS_MENUS, EXERCISES, ROUTINES } from '../routines';
import type { EndlessMenu } from '../types';

describe('Routines Integrity', () => {
    it('should have valid default endless menus', () => {
        expect(DEFAULT_ENDLESS_MENUS.length).toBeGreaterThan(0);
        DEFAULT_ENDLESS_MENUS.forEach((menu: EndlessMenu) => {
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
