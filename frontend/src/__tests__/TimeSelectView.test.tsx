import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TimeSelectView } from '../components/TimeSelectView';
import type { TimedMenu } from '../types';

// Mock Lucide icons to avoid rendering issues in test environment
vi.mock('lucide-react', () => ({
    Clock: () => <div data-testid="icon-clock" />,
    Zap: () => <div data-testid="icon-zap" />,
    Timer: () => <div data-testid="icon-timer" />,
    Flame: () => <div data-testid="icon-flame" />,
    ChevronRight: () => <div data-testid="icon-chevron-right" />,
    Loader2: () => <div data-testid="icon-loader" />,
    Dumbbell: () => <div data-testid="icon-dumbbell" />,
}));

describe('TimeSelectView', () => {
    const mockOnStartMenu = vi.fn();
    const mockApiBase = 'http://localhost:3000';
    const mockSession = {
        username: 'testuser',
        getIdToken: () => ({ getJwtToken: () => 'mock-token' }),
        getUsername: () => 'testuser',
    };

    it('renders duration options initially', () => {
        render(
            <TimeSelectView
                theme="light"
                session={mockSession as any}
                apiBase={mockApiBase}
                onStartMenu={mockOnStartMenu}
            />
        );

        expect(screen.getByText('15 min')).toBeInTheDocument();
        expect(screen.getByText('30 min')).toBeInTheDocument();
        expect(screen.getByText('60 min')).toBeInTheDocument();
    });

    it('fetches menus when a duration is selected', async () => {
        // Mock fetch response
        const mockMenus: TimedMenu[] = [{
            bodyPart: 'push',
            durationMinutes: 15,
            exercises: [{
                exerciseName: 'Test Press',
                sets: 3,
                reps: 10,
                recommendedWeight: 20,
                restSeconds: 60,
                notes: 'Test note'
            }],
            totalRestSeconds: 180,
            generatedAt: '2023-01-01'
        }];

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockMenus,
        });
        vi.stubGlobal('fetch', fetchMock);

        render(
            <TimeSelectView
                theme="light"
                session={mockSession as any}
                apiBase={mockApiBase}
                onStartMenu={mockOnStartMenu}
            />
        );

        // Click 15 min button
        fireEvent.click(screen.getByText('15 min'));

        // Should show loading or immediately show content (depending on async speed)
        // In this test, we verify fetch was called with correct params
        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/menus/by-duration'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer mock-token'
                    })
                })
            );
        });

        // Should display the menu
        await waitFor(() => {
            expect(screen.getByText('15 MIN MENUS')).toBeInTheDocument();
        });
    });
});
