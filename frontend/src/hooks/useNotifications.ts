import { useState, useCallback, useEffect } from 'react';

// Fallback for environments where SpeechSynthesisUtterance is not available (e.g. some test environments)
const UtteranceClass = typeof SpeechSynthesisUtterance !== 'undefined'
    ? SpeechSynthesisUtterance
    : (class { } as typeof SpeechSynthesisUtterance);

export function useNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>(
        'Notification' in window ? Notification.permission : 'denied'
    );
    const [isVocalEnabled, setIsVocalEnabled] = useState(() => {
        return localStorage.getItem('vocal_notifications') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('vocal_notifications', String(isVocalEnabled));
    }, [isVocalEnabled]);

    const requestPermission = useCallback(async () => {
        if (!('Notification' in window)) return 'denied';
        const res = await Notification.requestPermission();
        setPermission(res);
        return res;
    }, []);

    const speak = useCallback((text: string) => {
        if (!isVocalEnabled) return;

        // Cancel any pending speech
        window.speechSynthesis.cancel();

        const utterance = new UtteranceClass(text);
        utterance.lang = 'en-US'; // or 'ja-JP' depending on preference
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }, [isVocalEnabled]);

    const sendBanner = useCallback((title: string, body: string) => {
        if (permission !== 'granted') return;

        try {
            new Notification(title, {
                body,
                icon: '/icons/icon-192x192.png', // Correct if icon exists
                tag: 'workout-rest-timer'
            });
        } catch (e) {
            console.error('Notification failed:', e);
        }
    }, [permission]);

    const notifyRestComplete = useCallback(() => {
        // 1. Banner
        sendBanner('Rest Complete!', 'Ready for the next set?');

        // 2. Voice
        speak('Rest complete. Get ready.');

        // Vibration is usually handled by the component for better timing
    }, [sendBanner, speak]);

    return {
        permission,
        requestPermission,
        isVocalEnabled,
        setIsVocalEnabled,
        sendBanner,
        speak,
        notifyRestComplete
    };
}
