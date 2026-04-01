import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { saveWorkoutRecord, deleteWorkoutRecord, getWorkoutsSince, getRecentWorkouts, getAllWorkouts, saveMenus, getMenuByBodyPart } from '../db';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('db.ts', () => {
    beforeEach(() => {
        ddbMock.reset();
    });

    describe('saveWorkoutRecord', () => {
        it('should save a workout record with TTL', async () => {
            const payload: any = { user_id: 'user1', timestamp: '2026-01-01T00:00:00Z', activity: 'bench press' };
            ddbMock.on(PutCommand).resolves({});

            await saveWorkoutRecord(payload);

            expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
            const callArgs = ddbMock.commandCalls(PutCommand)[0].args[0].input;
            expect(callArgs.Item.PK).toBe('USER#user1');
            expect(callArgs.Item.SK).toBe('WORKOUT#2026-01-01T00:00:00Z');
            expect(callArgs.Item.expires_at).toBeGreaterThan(Date.now() / 1000);
        });
    });

    describe('deleteWorkoutRecord', () => {
        it('should delete a workout record', async () => {
            ddbMock.on(DeleteCommand).resolves({});

            await deleteWorkoutRecord('user1', '2026-01-01T00:00:00Z');

            expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(1);
            const callArgs = ddbMock.commandCalls(DeleteCommand)[0].args[0].input;
            expect(callArgs.Key.PK).toBe('USER#user1');
            expect(callArgs.Key.SK).toBe('WORKOUT#2026-01-01T00:00:00Z');
        });
    });

    describe('getWorkoutsSince', () => {
        it('should query workouts since a timestamp', async () => {
            const mockItems = [{ PK: 'USER#user1', SK: 'WORKOUT#2026-01-01T00:00:00Z' }];
            ddbMock.on(QueryCommand).resolves({ Items: mockItems });

            const result = await getWorkoutsSince('user1', '2026-01-01T00:00:00Z');

            expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(1);
            expect(result).toEqual(mockItems);
            const callArgs = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
            expect(callArgs.ExpressionAttributeValues[':pk']).toBe('USER#user1');
            expect(callArgs.ExpressionAttributeValues[':skStart']).toBe('WORKOUT#2026-01-01T00:00:00Z');
        });
    });

    describe('saveMenus', () => {
        it('should save menus in batches', async () => {
            const menus: any[] = Array.from({ length: 30 }, (_, i) => ({ bodyPart: `part${i}` }));
            ddbMock.on(BatchWriteCommand).resolves({});

            await saveMenus('user1', menus);

            // 30 items / 25 limit = 2 batches
            expect(ddbMock.commandCalls(BatchWriteCommand)).toHaveLength(2);

            // Verify TTL exists in the calls
            const firstBatch = ddbMock.commandCalls(BatchWriteCommand)[0].args[0].input.RequestItems['DumbbellProLog'];
            expect(firstBatch[0].PutRequest.Item.expires_at).toBeGreaterThan(Date.now() / 1000);
        });

        it('should do nothing if menus array is empty', async () => {
            await saveMenus('user1', []);
            expect(ddbMock.commandCalls(BatchWriteCommand)).toHaveLength(0);
        });
    });

    describe('getMenuByBodyPart', () => {
        it('should return a menu for a specific body part', async () => {
            const mockMenu = { bodyPart: 'push', exercises: [] };
            ddbMock.on(QueryCommand).resolves({ Items: [mockMenu] });

            const result = await getMenuByBodyPart('user1', 'push');

            expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(1);
            expect(result).toEqual(mockMenu);
        });

        it('should return undefined if no menu found', async () => {
            ddbMock.on(QueryCommand).resolves({ Items: [] });

            const result = await getMenuByBodyPart('user1', 'push');

            expect(result).toBeUndefined();
        });
    });
});
