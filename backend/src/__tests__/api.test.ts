import { describe, it, expect, vi, beforeEach } from 'vitest';
process.env.GEMINI_API_KEY = 'test-key';
import request from 'supertest';
import { app } from '../index';
import * as db from '../db';
import * as ai from '../ai';

// Mock DB and AI modules
vi.mock('../db');
vi.mock('../ai');

describe('API Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Authentication', () => {
        it('should return 401 if no auth provided', async () => {
            const response = await request(app).get('/ai/info');
            expect(response.status).toBe(401);
        });

        it('should pass if test auth header is provided', async () => {
            const response = await request(app)
                .get('/ai/info')
                .set('Authorization', 'Bearer test-user1');
            expect(response.status).toBe(200);
        });
    });

    describe('Workout Log', () => {
        it('should log a workout', async () => {
            (db.saveWorkoutRecord as any).mockResolvedValue({ success: true });
            const payload = { timestamp: '2026-01-01', exercise: 'pushup' };
            
            const response = await request(app)
                .post('/log')
                .set('Authorization', 'Bearer test-user1')
                .send(payload);
            
            expect(response.status).toBe(200);
            expect(db.saveWorkoutRecord).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'user1' // Verified ID from 'test-user1'
            }));
        });
    });

    describe('AI Endpoints', () => {
        it('should return recommendations', async () => {
            (db.getWorkoutsSince as any).mockResolvedValue([]);
            (ai.getTrainingRecommendation as any).mockResolvedValue({ general_advice: 'Keep it up' });

            const response = await request(app)
                .post('/ai/recommend')
                .set('Authorization', 'Bearer test-user1');

            expect(response.status).toBe(200);
            expect(response.body.general_advice).toBe('Keep it up');
        });
    });

    describe('Stats', () => {
        it('should return history', async () => {
            (db.getWorkoutsSince as any).mockResolvedValue([{ id: 1 }]);

            const response = await request(app)
                .post('/stats/history')
                .set('Authorization', 'Bearer test-user1');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
        });
    });
});
