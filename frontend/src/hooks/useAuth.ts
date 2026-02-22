import { useState, useEffect } from 'react';
import { CognitoUserPool } from 'amazon-cognito-identity-js';
import { COGNITO_CONFIG } from '../auth-config';

export function useAuth() {
    const [session, setSession] = useState<any>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    // Persistence & Initialization
    useEffect(() => {
        // Check Cognito Session
        const userPool = new CognitoUserPool({
            UserPoolId: COGNITO_CONFIG.UserPoolId,
            ClientId: COGNITO_CONFIG.ClientId,
        });
        const user = userPool.getCurrentUser();

        if (user) {
            user.getSession((_err: any, currentSession: any) => {
                if (currentSession && currentSession.isValid()) {
                    setSession(currentSession);
                }
                setIsAuthLoading(false);
            });
        } else {
            setTimeout(() => setIsAuthLoading(false), 0);
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
