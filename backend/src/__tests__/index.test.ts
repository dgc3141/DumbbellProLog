import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// Mock db module before importing app
vi.mock('../db', () => ({
    saveWorkoutRecord: vi.fn().mockResolvedValue({ user_id: 'user1', timestamp: '2026-01-01T00:00:00Z' }),
    deleteWorkoutRecord: vi.fn().mockResolvedValue(undefined),
    getWorkoutsSince: vi.fn().mockResolvedValue([]),
    getRecentWorkouts: vi.fn().mockResolvedValue([]),
    getAllWorkouts: vi.fn().mockResolvedValue([]),
    saveMenus: vi.fn().mockResolvedValue(undefined),
    getMenuByBodyPart: vi.fn().mockResolvedValue(undefined),
    saveExerciseMeta: vi.fn().mockResolvedValue({ user_id: 'user1', exercise_id: 'bench', tips: 'Keep tight', video_url: 'https://youtube.com' }),
    getExerciseMeta: vi.fn().mockResolvedValue(undefined),
    TABLE_NAME: 'DumbbellProLog',
    TTL_DURATION_SECONDS: 7776000,
}));

// Mock ai module
vi.mock('../ai', () => ({
    getTrainingRecommendation: vi.fn().mockResolvedValue({ recommendation: 'test' }),
    getGrowthAnalysis: vi.fn().mockResolvedValue({ analysis: 'test' }),
    generateEndlessMenus: vi.fn().mockResolvedValue([]),
}));

let app: Express;

beforeAll(async () => {
    const mod = await import('../index');
    app = mod.app;
});

// Helper: returns headers for a given user ID using the local dev fallback
const authHeader = (userId: string) => ({ Authorization: `Bearer test-${userId}` });

describe('IDOR Protection - PATCH /log', () => {
    it('should reject when payload user_id does not match authenticated user (403)', async () => {
        const res = await request(app)
            .patch('/log')
            .set(authHeader('user-alice'))
            .send({
                user_id: 'user-bob',  // attacker tries to modify another user's log
                timestamp: '2026-01-01T00:00:00Z',
                exercise: 'bench press',
                weight: 100,
                reps: 10,
                rpe: 8,
            });

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Forbidden/);
    });

    it('should succeed when payload user_id matches authenticated user (200)', async () => {
        const res = await request(app)
            .patch('/log')
            .set(authHeader('user-alice'))
            .send({
                user_id: 'user-alice',  // correct: own user_id
                timestamp: '2026-01-01T00:00:00Z',
                exercise: 'bench press',
                weight: 100,
                reps: 10,
                rpe: 8,
            });

        expect(res.status).toBe(200);
    });

    it('should succeed and use authenticated user when payload has no user_id (200)', async () => {
        const { saveWorkoutRecord } = await import('../db');

        const res = await request(app)
            .patch('/log')
            .set(authHeader('user-alice'))
            .send({
                // No user_id in payload - should default to authenticated user
                timestamp: '2026-01-01T00:00:00Z',
                exercise: 'bench press',
                weight: 100,
                reps: 10,
                rpe: 8,
            });

        expect(res.status).toBe(200);
        // Verify saveWorkoutRecord was called with the authenticated user's ID
        const callArgs = vi.mocked(saveWorkoutRecord).mock.calls.at(-1)?.[0];
        expect(callArgs?.user_id).toBe('user-alice');
    });
});

describe('IDOR Protection - DELETE /log', () => {
    it('should reject when payload user_id does not match authenticated user (403)', async () => {
        const res = await request(app)
            .delete('/log')
            .set(authHeader('user-alice'))
            .send({
                user_id: 'user-bob',  // attacker tries to delete another user's log
                timestamp: '2026-01-01T00:00:00Z',
            });

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Forbidden/);
    });

    it('should succeed when payload user_id matches authenticated user (204)', async () => {
        const res = await request(app)
            .delete('/log')
            .set(authHeader('user-alice'))
            .send({
                user_id: 'user-alice',  // correct: own user_id
                timestamp: '2026-01-01T00:00:00Z',
            });

        expect(res.status).toBe(204);
    });

    it('should succeed and use authenticated user when payload has no user_id (204)', async () => {
        const { deleteWorkoutRecord } = await import('../db');

        const res = await request(app)
            .delete('/log')
            .set(authHeader('user-alice'))
            .send({
                // No user_id in payload
                timestamp: '2026-01-01T00:00:00Z',
            });

        expect(res.status).toBe(204);
        // Verify deleteWorkoutRecord was called with the authenticated user's ID
        const [calledUserId] = vi.mocked(deleteWorkoutRecord).mock.calls.at(-1) ?? [];
        expect(calledUserId).toBe('user-alice');
    });

    it('should return 400 when timestamp is missing', async () => {
        const res = await request(app)
            .delete('/log')
            .set(authHeader('user-alice'))
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/timestamp/i);
    });
});

describe('Exercise Meta API', () => {
    it('should return default meta when no data exists (200)', async () => {
        const { getExerciseMeta } = await import('../db');
        vi.mocked(getExerciseMeta).mockResolvedValueOnce(undefined);

        const res = await request(app)
            .get('/meta/exercise/Bench%20Press')
            .set(authHeader('user-alice'));

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            user_id: 'user-alice',
            exercise_id: 'Bench Press',
            tips: '',
            video_url: ''
        });
    });

    it('should save exercise meta successfully (200)', async () => {
        const { saveExerciseMeta } = await import('../db');
        const payload = {
            tips: 'Retract scapula',
            video_url: 'https://youtube.com/test'
        };
        vi.mocked(saveExerciseMeta).mockResolvedValueOnce({
            user_id: 'user-alice',
            exercise_id: 'Bench Press',
            ...payload
        });

        const res = await request(app)
            .post('/meta/exercise/Bench%20Press')
            .set(authHeader('user-alice'))
            .send(payload);

        expect(res.status).toBe(200);
        const callArgs = vi.mocked(saveExerciseMeta).mock.calls.at(-1)?.[0];
        expect(callArgs?.user_id).toBe('user-alice');
        expect(callArgs?.exercise_id).toBe('Bench Press');
        expect(callArgs?.tips).toBe(payload.tips);
    });
});

describe('Authentication', () => {
    it('should return 401 when no Authorization header is provided in production mode', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const res = await request(app)
            .delete('/log')
            .send({ timestamp: '2026-01-01T00:00:00Z' });

        process.env.NODE_ENV = originalEnv;
        expect(res.status).toBe(401);
    });
});
