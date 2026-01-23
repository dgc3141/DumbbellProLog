import { useState, useEffect } from 'react';

interface RestTimerProps {
    duration?: number;
    onSkip: () => void;
    onFinish: () => void;
}

export default function RestTimer({ duration = 90, onSkip, onFinish }: RestTimerProps) {
    const [timeLeft, setTimeLeft] = useState(duration);

    useEffect(() => {
        if (timeLeft <= 0) {
            onFinish();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, onFinish]);

    const progress = (timeLeft / duration) * 100;

    return (
        <div className="bg-blue-600 rounded-[2.5rem] p-8 text-center shadow-2xl shadow-blue-900/20 relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-100/60 mb-2">Resting Time</p>
                <div className="text-8xl font-black tracking-tighter mb-6">{timeLeft}</div>

                <div className="w-full bg-white/20 h-2 rounded-full mb-8 overflow-hidden">
                    <div
                        className="bg-white h-full transition-all duration-1000 linear"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <button
                    onClick={onSkip}
                    className="w-full bg-white text-blue-600 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:brightness-110"
                >
                    Skip Rest
                </button>
            </div>

            {/* Background Decoration */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        </div>
    );
}
