import { useState, useEffect, useCallback } from 'react';

interface RestTimerProps {
    theme?: 'light' | 'dark';
    duration?: number;
    onSkip: () => void;
    onFinish: () => void;
}

export default function RestTimer({ theme = 'dark', duration = 90, onSkip, onFinish }: RestTimerProps) {
    const [timeLeft, setTimeLeft] = useState(duration);

    const triggerNotification = useCallback(() => {
        // 1. Vibration (Pattern: 200ms on, 100ms off, 200ms on)
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }

        // 2. Sound (Synthesized Beep)
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
            console.warn('Audio notification failed. (User interaction might be required)', e);
        }
    }, []);

    useEffect(() => {
        if (timeLeft <= 0) {
            triggerNotification();
            onFinish();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, onFinish, triggerNotification]);

    const progress = (timeLeft / duration) * 100;

    return (
        <div className={`rounded-[2.5rem] p-8 text-center shadow-2xl relative overflow-hidden transition-all ${theme === 'dark' ? 'bg-blue-600 shadow-blue-900/20 text-white' : 'bg-blue-500 shadow-blue-200/50 text-white'}`}>
            <div className="relative z-10">
                <p className={`text-[10px] font-black uppercase tracking-[0.5em] mb-2 ${theme === 'dark' ? 'text-blue-100/60' : 'text-white/80'}`}>Resting Time</p>
                <div className="text-8xl font-black tracking-tighter mb-6">{timeLeft}</div>

                <div className={`w-full h-2 rounded-full mb-8 overflow-hidden ${theme === 'dark' ? 'bg-white/20' : 'bg-black/10'}`}>
                    <div
                        className="bg-white h-full transition-all duration-1000 linear"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <button
                    onClick={onSkip}
                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:brightness-110 ${theme === 'dark' ? 'bg-white text-blue-600' : 'bg-white text-blue-500'}`}
                >
                    Skip Rest
                </button>
            </div>

            {/* Background Decoration */}
            <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl animate-pulse ${theme === 'dark' ? 'bg-white/5' : 'bg-white/20'}`}></div>
        </div>
    );
}
