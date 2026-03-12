import { describe, it, expect, vi, beforeEach } from 'vitest';
process.env.GEMINI_API_KEY = 'test-key';
import { getTrainingRecommendation, getGrowthAnalysis, generateEndlessMenus } from '../ai';

// Mock fetch for Gemini API
global.fetch = vi.fn();

describe('ai.ts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.GEMINI_API_KEY = 'test-key';
    });

    describe('getTrainingRecommendation', () => {
        it('should return recommendations when history is provided', async () => {
            const mockResponse = {
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                recommendations: [{
                                    exercise_id: 'bench_press',
                                    recommended_weight: 50,
                                    recommended_reps: 10,
                                    comment: 'Keep going'
                                }],
                                general_advice: 'Good progress'
                            })
                        }]
                    }
                }]
            };
            (fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });

            const history: any[] = [{ exercise_id: 'bench_press', weight: 45, reps: 10, rpe: 'easy' }];
            const result = await getTrainingRecommendation(history);

            expect(fetch).toHaveBeenCalled();
            expect(result.recommendations[0].exercise_id).toBe('bench_press');
            expect(result.general_advice).toBe('Good progress');
        });

        it('should return a default message when history is empty', async () => {
            const result = await getTrainingRecommendation([]);
            expect(result.recommendations).toHaveLength(0);
            expect(result.general_advice).toContain('履歴がありません');
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should throw an error if Gemini returns invalid JSON', async () => {
             (fetch as any).mockResolvedValue({
                ok: true,
                json: async () => ({ candidates: [{ content: { parts: [{ text: 'invalid json' }] } }] }),
            });

            await expect(getTrainingRecommendation([{ exercise_id: 'test' } as any]))
                .rejects.toThrow('Failed to parse AI response');
        });
    });

    describe('getGrowthAnalysis', () => {
        it('should return growth analysis', async () => {
            const mockResponse = {
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                insights: ['Insight 1'],
                                plateau_warnings: ['Warning 1'],
                                encouragement: 'Keep it up'
                            })
                        }]
                    }
                }]
            };
            (fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await getGrowthAnalysis([{ exercise_id: 'test' } as any]);
            expect(result.insights).toContain('Insight 1');
            expect(result.encouragement).toBe('Keep it up');
        });
    });

    describe('generateEndlessMenus', () => {
        it('should generate multiple menus', async () => {
            const mockResponse = {
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify([
                                {
                                    bodyPart: 'push',
                                    exercises: [{ exerciseName: 'Bench Press', sets: 3, reps: 10, recommendedWeight: 50, restSeconds: 90, notes: '' }],
                                    generatedAt: new Date().toISOString()
                                },
                                {
                                    bodyPart: 'pull',
                                    exercises: [],
                                    generatedAt: new Date().toISOString()
                                },
                                {
                                    bodyPart: 'legs',
                                    exercises: [],
                                    generatedAt: new Date().toISOString()
                                }
                            ])
                        }]
                    }
                }]
            };
            (fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await generateEndlessMenus([]);
            expect(result).toHaveLength(3);
            expect(result[0].bodyPart).toBe('push');
        });
    });
});
