
import { useState } from 'react';
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import { COGNITO_CONFIG } from '../auth-config';
import { Lock, User, LifeBuoy } from 'lucide-react';

interface LoginViewProps {
    theme: 'light' | 'dark';
    onLoginSuccess: (session: any) => void;
}

export default function LoginView({ theme, onLoginSuccess }: LoginViewProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const userPool = new CognitoUserPool({
            UserPoolId: COGNITO_CONFIG.UserPoolId,
            ClientId: COGNITO_CONFIG.ClientId,
        });

        const user = new CognitoUser({
            Username: username,
            Pool: userPool,
        });

        const authDetails = new AuthenticationDetails({
            Username: username,
            Password: password,
        });

        user.authenticateUser(authDetails, {
            onSuccess: (session) => {
                setIsLoading(false);
                onLoginSuccess(session);
            },
            onFailure: (err) => {
                setIsLoading(false);
                setError(err.message || JSON.stringify(err));
            },
            newPasswordRequired: (userAttributes) => {
                setIsLoading(false);
                setError('New password required. Please use AWS CLI to set a permanent password.');
                // For simplified private use, we assume the user is already set up.
                console.log('New password required', userAttributes);
            }
        });
    };

    return (
        <div className="min-h-[80vh] flex flex-col justify-center animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-10">
                <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 text-blue-500 mb-4">
                    <Lock size={32} />
                </div>
                <h1 className="text-4xl font-black italic tracking-tighter mb-2">PRIVATE ACCESS</h1>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Authorized Personnel Only</p>
            </div>

            <form onSubmit={handleLogin} className="glass-card p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl">
                <div className="space-y-6">
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={`w-full pl-12 pr-4 py-4 rounded-2xl border bg-transparent font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${theme === 'dark' ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'
                                }`}
                            required
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full pl-12 pr-4 py-4 rounded-2xl border bg-transparent font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${theme === 'dark' ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'
                                }`}
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/50 text-red-400 text-xs font-bold leading-relaxed">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </div>
            </form>

            <div className="mt-10 flex items-center justify-center gap-2 text-slate-500">
                <LifeBuoy size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Self-signup disabled</span>
            </div>
        </div>
    );
}
