import { useState } from 'react';
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import { COGNITO_CONFIG } from '../auth-config';
import { Lock, User, LifeBuoy, ArrowLeft, KeyRound, Mail, ShieldCheck } from 'lucide-react';

interface LoginViewProps {
    theme: 'light' | 'dark';
    onLoginSuccess: (session: any) => void;
}

type ViewMode = 'login' | 'forgot_password' | 'confirm_reset' | 'new_password_required';

export default function LoginView({ theme, onLoginSuccess }: LoginViewProps) {
    const [mode, setMode] = useState<ViewMode>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmationCode, setConfirmationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [userForChallenge, setUserForChallenge] = useState<CognitoUser | null>(null);

    const getUser = (name: string) => {
        const userPool = new CognitoUserPool({
            UserPoolId: COGNITO_CONFIG.UserPoolId,
            ClientId: COGNITO_CONFIG.ClientId,
        });
        return new CognitoUser({
            Username: name,
            Pool: userPool,
        });
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        const user = getUser(username);
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
                setUserForChallenge(user);
                setMode('new_password_required');
                console.log('New password required', userAttributes);
            }
        });
    };

    const handleForgotPassword = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const user = getUser(username);
        user.forgotPassword({
            onSuccess: () => {
                setIsLoading(false);
                setMode('confirm_reset');
                setSuccessMessage('Verification code sent to your email.');
            },
            onFailure: (err) => {
                setIsLoading(false);
                setError(err.message || JSON.stringify(err));
            }
        });
    };

    const handleConfirmReset = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const user = getUser(username);
        user.confirmPassword(confirmationCode, password, {
            onSuccess: () => {
                setIsLoading(false);
                setMode('login');
                setSuccessMessage('Password reset successful. Please sign in with your new password.');
                setPassword('');
            },
            onFailure: (err) => {
                setIsLoading(false);
                setError(err.message || JSON.stringify(err));
            }
        });
    };

    const handleCompleteNewPassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userForChallenge) return;

        setIsLoading(true);
        setError(null);

        userForChallenge.completeNewPasswordChallenge(newPassword, {}, {
            onSuccess: (session) => {
                setIsLoading(false);
                onLoginSuccess(session);
            },
            onFailure: (err) => {
                setIsLoading(false);
                setError(err.message || JSON.stringify(err));
            }
        });
    };

    const renderLoginForm = () => (
        <form onSubmit={handleLogin} className="glass-card p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border bg-transparent font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${theme === 'dark' ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'}`}
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
                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border bg-transparent font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${theme === 'dark' ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'}`}
                        required
                    />
                </div>

                {error && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/50 text-red-400 text-xs font-bold leading-relaxed">
                        {error}
                    </div>
                )}

                {successMessage && !error && (
                    <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/50 text-green-400 text-xs font-bold leading-relaxed">
                        {successMessage}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign In'}
                </button>

                <div className="pt-2 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setMode('forgot_password');
                            setError(null);
                            setSuccessMessage(null);
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-500 transition-colors"
                    >
                        Forgot Password?
                    </button>
                </div>
            </div>
        </form>
    );

    const renderForgotPasswordForm = () => (
        <form onSubmit={handleForgotPassword} className="glass-card p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl animate-in slide-in-from-right-4 duration-500">
            <div className="space-y-6">
                <div className="mb-4">
                    <h2 className="text-xl font-black italic mb-2">RESET PASSWORD</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                        Enter your username to receive a verification code via email.
                    </p>
                </div>

                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border bg-transparent font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${theme === 'dark' ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'}`}
                        required
                    />
                </div>

                {error && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/50 text-red-400 text-xs font-bold leading-relaxed">
                        {error}
                    </div>
                )}

                <div className="flex flex-col gap-4 mt-8">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send Code'}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setMode('login');
                            setError(null);
                        }}
                        className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={14} /> Back to Sign In
                    </button>
                </div>
            </div>
        </form>
    );

    const renderConfirmResetForm = () => (
        <form onSubmit={handleConfirmReset} className="glass-card p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl animate-in slide-in-from-right-4 duration-500">
            <div className="space-y-6">
                <div className="mb-4">
                    <h2 className="text-xl font-black italic mb-2">SET NEW PASSWORD</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                        Verification code was sent. Please enter the code and your new password.
                    </p>
                </div>

                <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Verification Code"
                        value={confirmationCode}
                        onChange={(e) => setConfirmationCode(e.target.value)}
                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border bg-transparent font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${theme === 'dark' ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'}`}
                        required
                    />
                </div>

                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="password"
                        placeholder="New Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border bg-transparent font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${theme === 'dark' ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'}`}
                        required
                    />
                </div>

                {error && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/50 text-red-400 text-xs font-bold leading-relaxed">
                        {error}
                    </div>
                )}

                {successMessage && !error && (
                    <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/50 text-green-400 text-xs font-bold leading-relaxed">
                        {successMessage}
                    </div>
                )}

                <div className="flex flex-col gap-4 mt-8">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Reset Password'}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setMode('forgot_password');
                            setError(null);
                        }}
                        className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={14} /> Resend Code
                    </button>
                </div>
            </div>
        </form>
    );

    const renderNewPasswordRequiredForm = () => (
        <form onSubmit={handleCompleteNewPassword} className="glass-card p-8 rounded-[3rem] border border-blue-500/30 shadow-2xl animate-in fade-in duration-500">
            <div className="space-y-6">
                <div className="mb-4">
                    <div className="flex items-center gap-2 text-blue-500 mb-2">
                        <ShieldCheck size={20} />
                        <h2 className="text-xl font-black italic">UPDATE INITIAL PASSWORD</h2>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                        Admin has created your account. You must set a permanent password to continue.
                    </p>
                </div>

                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="password"
                        placeholder="New Permanent Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border bg-transparent font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${theme === 'dark' ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'}`}
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
                    {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Set Password & Sign In'}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setMode('login');
                        setUserForChallenge(null);
                        setError(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                >
                    <ArrowLeft size={14} /> Back to Sign In
                </button>
            </div>
        </form>
    );

    return (
        <div className="min-h-[80vh] flex flex-col justify-center animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-10">
                <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 text-blue-500 mb-4">
                    <Lock size={32} />
                </div>
                <h1 className="text-4xl font-black italic tracking-tighter mb-2">PRIVATE ACCESS</h1>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Authorized Personnel Only</p>
            </div>

            {mode === 'login' && renderLoginForm()}
            {mode === 'forgot_password' && renderForgotPasswordForm()}
            {mode === 'confirm_reset' && renderConfirmResetForm()}
            {mode === 'new_password_required' && renderNewPasswordRequiredForm()}

            <div className="mt-10 flex items-center justify-center gap-2 text-slate-500">
                <LifeBuoy size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Self-signup disabled</span>
            </div>
        </div>
    );
}
