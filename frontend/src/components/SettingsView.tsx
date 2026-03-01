import { useState, useEffect, useCallback } from 'react';
import { CognitoIdentityProviderClient, StartWebAuthnRegistrationCommand, CompleteWebAuthnRegistrationCommand } from '@aws-sdk/client-cognito-identity-provider';
import { ShieldCheck, Fingerprint, Loader2, CheckCircle2, XCircle, Sparkles, Bot, Bell, Volume2, VolumeX } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import type { AIInfoResponse } from '../types';

interface SettingsViewProps {
    theme: 'light' | 'dark';
    session: any;
    apiBase: string;
    onBack?: () => void;
}

type SettingsTab = 'security' | 'ai' | 'preferences';

export default function SettingsView({ theme: _theme, session, apiBase, onBack }: SettingsViewProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<SettingsTab>('preferences'); // Default to preferences for visibility
    const [aiInfo, setAiInfo] = useState<AIInfoResponse | null>(null);
    const [isAiInfoLoading, setIsAiInfoLoading] = useState(false);
    const { permission, requestPermission, isVocalEnabled, setIsVocalEnabled } = useNotifications();

    const fetchAIInfo = useCallback(async () => {
        setIsAiInfoLoading(true);
        try {
            const headers: Record<string, string> = {};
            if (session) {
                headers['Authorization'] = `Bearer ${session.getIdToken().getJwtToken()}`;
            }
            const response = await fetch(`${apiBase}/ai/info`, { headers });
            if (response.ok) {
                const data: AIInfoResponse = await response.json();
                setAiInfo(data);
            } else {
                console.error('AI info fetch failed:', response.status, await response.text());
            }
        } catch (e) {
            console.error('Failed to fetch AI info:', e);
        } finally {
            setIsAiInfoLoading(false);
        }
    }, [apiBase, session]);

    // AI情報を取得
    useEffect(() => {
        if (activeTab === 'ai' && !aiInfo) {
            fetchAIInfo();
        }
    }, [activeTab, aiInfo, fetchAIInfo]);

    const registerPasskey = async () => {
        setIsLoading(true);
        setMessage(null);

        try {
            const client = new CognitoIdentityProviderClient({ region: 'ap-northeast-1' });
            const accessToken = session.getAccessToken().getJwtToken();

            // 1. Start Registration
            const startCommand = new StartWebAuthnRegistrationCommand({
                AccessToken: accessToken
            });
            const startResponse = await client.send(startCommand);

            if (!startResponse.CredentialCreationOptions) {
                throw new Error('Failed to start WebAuthn registration');
            }

            // 2. Browser WebAuthn API Call
            const options = startResponse.CredentialCreationOptions;

            const credential = await navigator.credentials.create({
                publicKey: options as any
            });

            if (!credential) {
                throw new Error('Credential creation failed or cancelled');
            }

            // 3. Complete Registration
            const completeCommand = new CompleteWebAuthnRegistrationCommand({
                AccessToken: accessToken,
                Credential: {
                    id: credential.id,
                    rawId: new Uint8Array((credential as any).rawId),
                    response: {
                        attestationObject: new Uint8Array((credential as any).response.attestationObject),
                        clientDataJSON: new Uint8Array((credential as any).response.clientDataJSON)
                    },
                    type: credential.type
                } as any
            });

            await client.send(completeCommand);

            setMessage({ type: 'success', text: 'Passkey registered successfully!' });

        } catch (err: any) {
            console.error('Passkey registration error:', err);
            setMessage({ type: 'error', text: err.message || 'Failed to register Passkey' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-500`}>
            <div className="absolute inset-0 bg-slate-900/80" />

            <div className="relative w-full max-w-md glass-card p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-black italic">SETTINGS</h2>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-1.5 mb-8 bg-slate-800/50 rounded-2xl p-1 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('preferences')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'preferences'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Bell size={14} />
                        Prefs
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'security'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <ShieldCheck size={14} />
                        Security
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'ai'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Sparkles size={14} />
                        AI
                    </button>
                </div>
                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="p-6 rounded-3xl bg-slate-800/50 border border-slate-700/50">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                                    <Bell size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-white text-sm">Notifications</h3>
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">
                                        Status: <span className={permission === 'granted' ? 'text-green-400' : 'text-orange-400'}>{permission.toUpperCase()}</span>
                                    </p>
                                </div>
                            </div>

                            {permission !== 'granted' && (
                                <button
                                    onClick={requestPermission}
                                    className="w-full py-4 mb-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider text-[10px] transition-all active:scale-95"
                                >
                                    Enable System Alerts
                                </button>
                            )}

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-slate-700/30">
                                    <div className="flex items-center gap-3">
                                        {isVocalEnabled ? <Volume2 size={18} className="text-blue-400" /> : <VolumeX size={18} className="text-slate-500" />}
                                        <span className="text-xs font-bold text-slate-200">Voice Alerts (TTS)</span>
                                    </div>
                                    <button
                                        onClick={() => setIsVocalEnabled(!isVocalEnabled)}
                                        className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${isVocalEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${isVocalEnabled ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 px-2">Enable this to hear "Rest complete" announcements.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="p-6 rounded-3xl bg-slate-800/50 border border-slate-700/50">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-2xl bg-slate-700/50 text-white">
                                    <Fingerprint size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Passkey</h3>
                                    <p className="text-xs text-slate-400">Sign in with FaceID, TouchID, or Hello</p>
                                </div>
                            </div>

                            <button
                                onClick={registerPasskey}
                                disabled={isLoading}
                                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider text-xs transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Registering...
                                    </>
                                ) : (
                                    'Register New Passkey'
                                )}
                            </button>
                        </div>

                        {message && (
                            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${message.type === 'success'
                                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}>
                                {message.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                <span className="text-xs font-bold">{message.text}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* AI Tab */}
                {activeTab === 'ai' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {isAiInfoLoading ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 size={24} className="text-blue-500 animate-spin mb-2" />
                                <p className="text-xs text-slate-500">Loading AI info...</p>
                            </div>
                        ) : aiInfo ? (
                            <>
                                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                                            <Bot size={28} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg text-white">{aiInfo.modelName}</h3>
                                            <p className="text-xs text-blue-400 font-bold">{aiInfo.provider}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Model ID</span>
                                            <span className="text-xs font-mono text-slate-300">{aiInfo.modelId}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Provider</span>
                                            <span className="text-xs font-bold text-slate-300">{aiInfo.provider}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Status</span>
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-green-400">
                                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                                Active
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/30">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">AI の役割</p>
                                    <ul className="space-y-1.5 text-xs text-slate-400">
                                        <li className="flex items-center gap-2"><Sparkles size={12} className="text-blue-400" /> トレーニング推奨の生成</li>
                                        <li className="flex items-center gap-2"><Sparkles size={12} className="text-blue-400" /> 時間別メニューの自動作成</li>
                                        <li className="flex items-center gap-2"><Sparkles size={12} className="text-blue-400" /> レスト時間の最適化</li>
                                        <li className="flex items-center gap-2"><Sparkles size={12} className="text-blue-400" /> 長期成長分析</li>
                                    </ul>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-sm text-slate-500">AI情報の取得に失敗しました</p>
                                <button
                                    onClick={fetchAIInfo}
                                    className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-bold"
                                >
                                    再試行
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-8 text-center">
                    <button
                        onClick={onBack}
                        className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                    >
                        Close Settings
                    </button>
                    <div className="mt-8 pt-4 border-t border-slate-700/30">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                            Last Updated: {__BUILD_TIMESTAMP__}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
