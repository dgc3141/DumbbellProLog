import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RestTimer from '../components/RestTimer';

describe('RestTimer', () => {
    const mockOnSkip = vi.fn();
    const mockOnFinish = vi.fn();

    it('calculates initial timeLeft correctly when startTime is provided', () => {
        // Assume duration is 90 seconds, and 30 seconds have already passed
        const duration = 90;
        const startTime = Date.now() - 30000; // 30 seconds ago

        render(
            <RestTimer
                duration={duration}
                startTime={startTime}
                onSkip={mockOnSkip}
                onFinish={mockOnFinish}
            />
        );

        // Should show approximately 60 seconds left (90 - 30)
        // We use a regex to be flexible with minor timing differences (e.g. 59 or 60)
        const timeLeftElement = screen.getByText(/^(59|60)$/);
        expect(timeLeftElement).toBeInTheDocument();
    });

    it('shows full duration if no startTime is provided', () => {
        render(
            <RestTimer
                duration={90}
                onSkip={mockOnSkip}
                onFinish={mockOnFinish}
            />
        );

        expect(screen.getByText('90')).toBeInTheDocument();
    });
});
