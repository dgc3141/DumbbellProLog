import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StatsDashboard } from '../components/StatsDashboard';
import type { CognitoSession, WorkoutSet } from '../types';

// Recharts をモック（SVG描画が不要なため）
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Bar: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
}));

vi.mock('lucide-react', () => ({
    Sparkles: () => <div data-testid="icon-sparkles" />,
    AlertTriangle: () => <div data-testid="icon-alert" />,
    Lightbulb: () => <div data-testid="icon-lightbulb" />,
    History: () => <div data-testid="icon-history" />,
    Edit2: () => <div data-testid="icon-edit" />,
    Dumbbell: () => <div data-testid="icon-dumbbell" />,
    Layers: () => <div data-testid="icon-layers" />,
    Trophy: () => <div data-testid="icon-trophy" />,
}));

// PerformanceGraph をモック
vi.mock('../components/PerformanceGraph', () => ({
    default: () => <div data-testid="performance-graph" />,
}));

// EditLogModal をモック
vi.mock('../components/EditLogModal', () => ({
    default: () => <div data-testid="edit-log-modal" />,
}));

const mockSession: CognitoSession = {
    getIdToken: () => ({
        getJwtToken: () => 'mock-token',
        payload: { 'cognito:username': 'testuser' },
    }),
};

const mockHistory: WorkoutSet[] = [
    { user_id: 'testuser', timestamp: '2026-03-01T10:00:00Z', exercise_id: 'push_1', weight: 30, reps: 10, rpe: 'just' },
    { user_id: 'testuser', timestamp: '2026-03-01T10:05:00Z', exercise_id: 'push_1', weight: 30, reps: 8, rpe: 'limit' },
    { user_id: 'testuser', timestamp: '2026-03-03T10:00:00Z', exercise_id: 'legs_1', weight: 40, reps: 10, rpe: 'easy' },
];

describe('StatsDashboard', () => {
    const mockOnUpdateLog = vi.fn();
    const mockOnDeleteLog = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('APIフェッチ中はSkeletonを表示する', async () => {
        // fetch が pending のままにする
        vi.stubGlobal('fetch', vi.fn(() => new Promise(() => { })));

        render(
            <StatsDashboard
                theme="dark"
                session={mockSession}
                onUpdateLog={mockOnUpdateLog}
                onDeleteLog={mockOnDeleteLog}
            />
        );

        // Skeleton要素が表示されることを確認（data-testidがないのでclass or role確認）
        // isFetching=true の間はサマリーカードが表示されないことを確認
        expect(screen.queryByText('Workouts')).toBeNull();
        expect(screen.queryByText('Total Sets')).toBeNull();
    });

    it('履歴データがある場合、サマリーカードを正しい値で表示する', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockHistory,
        }));

        render(
            <StatsDashboard
                theme="dark"
                session={mockSession}
                onUpdateLog={mockOnUpdateLog}
                onDeleteLog={mockOnDeleteLog}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Workouts')).toBeInTheDocument();
        });

        // Total Workouts: 2日（3/1と3/3）
        expect(screen.getByText('2')).toBeInTheDocument();
        // Total Sets: 3件
        expect(screen.getByText('3')).toBeInTheDocument();
        // Top Exercise: push_1（インクライン・プレス）が2件でトップ
        // HistoryリストにもTop Exercise名が表示されるのでgetAllByTextで確認
        expect(screen.getAllByText('インクライン・プレス').length).toBeGreaterThanOrEqual(1);
    });

    it('履歴が空の場合、No Data Available Yet を表示する', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [],
        }));

        render(
            <StatsDashboard
                theme="dark"
                session={mockSession}
                onUpdateLog={mockOnUpdateLog}
                onDeleteLog={mockOnDeleteLog}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('No Data Available Yet')).toBeInTheDocument();
        });
    });

    it('APIエラー時にエラーメッセージを表示する', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error',
        }));

        render(
            <StatsDashboard
                theme="dark"
                session={mockSession}
                onUpdateLog={mockOnUpdateLog}
                onDeleteLog={mockOnDeleteLog}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Failed to Load History')).toBeInTheDocument();
        });
    });

    it('sessionがnullの場合、isFetchingがfalseでデータが空になる', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        render(
            <StatsDashboard
                theme="dark"
                session={null}
                onUpdateLog={mockOnUpdateLog}
                onDeleteLog={mockOnDeleteLog}
            />
        );

        // sessionがnullの場合はfetchが呼ばれないので空状態
        expect(fetchMock).not.toHaveBeenCalled();
        // データなし表示
        await waitFor(() => {
            expect(screen.getByText('No Data Available Yet')).toBeInTheDocument();
        });
    });
});
