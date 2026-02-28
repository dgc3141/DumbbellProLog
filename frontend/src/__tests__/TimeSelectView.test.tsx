import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TimeSelectView } from '../components/TimeSelectView';
import type { EndlessMenu, CognitoSession } from '../types';

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
    const mockSession: CognitoSession = {
        getIdToken: () => ({ getJwtToken: () => 'mock-token' }),
        getUsername: () => 'testuser',
    };

    it('renders body part options initially', () => {
        render(
            <TimeSelectView
                session={mockSession}
                apiBase={mockApiBase}
                onStartMenu={mockOnStartMenu}
            />
        );

        expect(screen.getByText('Push')).toBeInTheDocument();
        expect(screen.getByText('Pull')).toBeInTheDocument();
        expect(screen.getByText('Legs')).toBeInTheDocument();
    });

    it('fetches menus when a body part is selected and calls onStartMenu', async () => {
        // Mock fetch response
        const mockMenus: EndlessMenu[] = [{
            bodyPart: 'push',
            exercises: [{
                exerciseName: 'Test Press',
                sets: 3,
                reps: 10,
                recommendedWeight: 20,
                restSeconds: 60,
                notes: 'Test note'
            }],
            generatedAt: '2023-01-01'
        }];

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockMenus,
        });
        vi.stubGlobal('fetch', fetchMock);

        render(
            <TimeSelectView
                session={mockSession}
                apiBase={mockApiBase}
                onStartMenu={mockOnStartMenu}
            />
        );

        // Click Push button
        fireEvent.click(screen.getByText('Push'));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/menus/by-body-part'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer mock-token'
                    }),
                    body: expect.stringContaining('"bodyPart":"push"')
                })
            );
        });

        // Should call onStartMenu with the fetched menu
        await waitFor(() => {
            expect(mockOnStartMenu).toHaveBeenCalledWith(mockMenus[0]);
        });
    });
});
