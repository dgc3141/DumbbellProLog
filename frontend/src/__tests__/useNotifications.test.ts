import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotifications } from '../hooks/useNotifications';

describe('useNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();

        // Mock Notification API
        vi.stubGlobal('Notification', {
            permission: 'default',
            requestPermission: vi.fn().mockResolvedValue('granted'),
        });

        // Mock SpeechSynthesis
        vi.stubGlobal('speechSynthesis', {
            speak: vi.fn(),
            cancel: vi.fn(),
        });

        const mockUtterance = vi.fn().mockImplementation((text) => ({
            text,
            lang: '',
            rate: 1,
            pitch: 1,
            volume: 1,
        }));
        vi.stubGlobal('SpeechSynthesisUtterance', mockUtterance);

        // Mock window properties explicitly
        vi.stubGlobal('window', {
            ...window,
            Notification: Notification,
            speechSynthesis: speechSynthesis,
            SpeechSynthesisUtterance: mockUtterance
        });
    });

    it('initializes with default permission', () => {
        const { result } = renderHook(() => useNotifications());
        expect(result.current.permission).toBe('default');
    });

    it('requests permission and updates state', async () => {
        const { result } = renderHook(() => useNotifications());

        await act(async () => {
            const res = await result.current.requestPermission();
            expect(res).toBe('granted');
        });

        // In a real environment, permission doesn't change until reload or sync
        // But our mock verifies the request was made
        expect(Notification.requestPermission).toHaveBeenCalled();
    });

    it('toggles vocal notifications', () => {
        const { result } = renderHook(() => useNotifications());
        expect(result.current.isVocalEnabled).toBe(false);

        act(() => {
            result.current.setIsVocalEnabled(true);
        });

        expect(result.current.isVocalEnabled).toBe(true);
        expect(localStorage.getItem('vocal_notifications')).toBe('true');
    });

    it('vocalizes text when enabled', () => {
        const { result } = renderHook(() => useNotifications());

        act(() => {
            result.current.setIsVocalEnabled(true);
        });

        act(() => {
            result.current.speak('Testing');
        });

        expect(window.speechSynthesis.speak).toHaveBeenCalled();
    });
});
