import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot } from 'lucide-react';
import type { CognitoSession, ChatMessage } from '../types';
import { API_BASE } from '../config';

interface ChatDrawerProps {
    theme?: 'dark' | 'light';
    session: CognitoSession | null;
    onClose: () => void;
}

export default function ChatDrawer({ theme = 'dark', session, onClose }: ChatDrawerProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initial greeting
        setMessages([{ role: 'assistant', content: 'お疲れ様です！今日のトレーニングで気になることはありますか？' }]);
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !session || isLoading) return;

        const userMsg: ChatMessage = { role: 'user', content: input };
        const newHistory = [...messages, userMsg];
        setMessages(newHistory);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.getIdToken().getJwtToken()}`
                },
                body: JSON.stringify({
                    chatHistory: newHistory.slice(-10), // Send last 10 messages context
                    message: userMsg.content
                })
            });

            const data = await res.json();
            if (data.reply) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。' }]);
            }
        } catch(err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'assistant', content: '通信に失敗しました。もう一度お試しください。' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full h-[85vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300 ${theme === 'dark' ? 'bg-[#0f172a] border-t border-slate-700/50 text-white' : 'bg-white border-t border-slate-200 text-slate-800'}`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-5 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-500 flex flex-col items-center justify-center">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black italic">AI BUDDY</h2>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Personal Coach</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-full ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'} active:scale-95 transition-all`}>
                        <X size={20} />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm font-bold leading-relaxed whitespace-pre-wrap break-words ${
                                msg.role === 'user' 
                                  ? 'bg-blue-600 text-white rounded-br-none' 
                                  : theme === 'dark' 
                                    ? 'bg-slate-800 text-slate-200 rounded-bl-none' 
                                    : 'bg-slate-100 text-slate-800 rounded-bl-none'
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className={`max-w-[80%] rounded-2xl px-6 py-4 rounded-bl-none flex gap-1.5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} className="h-4" />
                </div>

                {/* Input Area */}
                <div className={`p-4 border-t pb-8 ${theme === 'dark' ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-100 bg-white'}`}>
                    <form onSubmit={handleSend} className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="AIに何でも相談..."
                            className={`w-full h-14 rounded-2xl pl-5 pr-14 text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className={`absolute right-2 w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                                !input.trim() || isLoading
                                    ? 'text-slate-400'
                                    : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95'
                            }`}
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
