import { useState } from 'react';
import { CognitoIdentityProviderClient, StartWebAuthnRegistrationCommand, CompleteWebAuthnRegistrationCommand } from '@aws-sdk/client-cognito-identity-provider';
import { ShieldCheck, Fingerprint, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface SettingsViewProps {
    theme: 'light' | 'dark'; // Kept for interface consistency though unused in logic
    session: any;
    onBack?: () => void;
}

export default function SettingsView({ session, onBack }: SettingsViewProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
                <div className="text-center mb-8">
                    <div className="inline-flex p-4 rounded-full bg-blue-500/10 text-blue-400 mb-4">
                        <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-2xl font-black italic">SECURITY SETTINGS</h2>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-2">Manage your credentials</p>
                </div>

                <div className="space-y-6">
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

                <div className="mt-8 text-center">
                    <button
                        onClick={onBack}
                        className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                    >
                        Close Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
