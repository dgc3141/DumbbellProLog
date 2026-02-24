import { useState, useEffect } from 'react';
import { CognitoUserPool } from 'amazon-cognito-identity-js';
import { COGNITO_CONFIG } from '../auth-config';
import type { CognitoSession } from '../types';

export function useAuth() {
    const [session, setSession] = useState<CognitoSession | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    useEffect(() => {
        const userPool = new CognitoUserPool({
            UserPoolId: COGNITO_CONFIG.UserPoolId,
            ClientId: COGNITO_CONFIG.ClientId,
        });
        const user = userPool.getCurrentUser();

        if (user) {
            user.getSession((_err: any, currentSession: any) => {
                if (currentSession && currentSession.isValid()) {
                    setSession(currentSession as CognitoSession);
                }
                setIsAuthLoading(false);
            });
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsAuthLoading(false);
        }
    }, []);

    const logout = () => {
        const userPool = new CognitoUserPool({
            UserPoolId: COGNITO_CONFIG.UserPoolId,
            ClientId: COGNITO_CONFIG.ClientId
        });
        userPool.getCurrentUser()?.signOut();
        setSession(null);
    };

    return { session, setSession, isAuthLoading, logout };
}
