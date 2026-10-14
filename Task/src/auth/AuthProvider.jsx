import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as authApi from '../api/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState('loading');
    const [sessionError, setSessionError] = useState(null);
    const sessionRequestRef = useRef(null);

    async function refreshSession() {
        if (sessionRequestRef.current) return sessionRequestRef.current;

        setStatus('loading');
        setSessionError(null);
        const request = (async () => {
            try {
                const response = await authApi.me();
                setUser(response.data.data.user);
                setStatus('authenticated');
                return response.data.data.user;
            } catch (error) {
                setUser(null);
                if (error.response?.status === 401) {
                    setStatus('anonymous');
                    setSessionError(null);
                } else {
                    setStatus('error');
                    setSessionError(
                        error.code === 'API_NOT_CONFIGURED'
                            ? 'This deployment is missing VITE_API_URL. Sign-in and data features are unavailable until it is configured and rebuilt.'
                            : 'We could not reach the API. Check your connection and try again.',
                    );
                }
                return null;
            } finally {
                sessionRequestRef.current = null;
            }
        })();
        sessionRequestRef.current = request;
        return request;
    }

    async function login(payload) {
        const response = await authApi.login(payload);
        const nextUser = response.data.data.user;
        setUser(nextUser);
        setStatus('authenticated');
        setSessionError(null);
        return nextUser;
    }

    async function register(payload) {
        const response = await authApi.register(payload);
        const nextUser = response.data.data.user;
        setUser(nextUser);
        setStatus('authenticated');
        setSessionError(null);
        return nextUser;
    }

    async function logout() {
        await authApi.logout();
        setUser(null);
        setStatus('anonymous');
        setSessionError(null);
    }

    useEffect(() => {
        const handleExpired = () => {
            setUser(null);
            setStatus('anonymous');
            setSessionError(null);
        };
        window.addEventListener('auth:expired', handleExpired);
        refreshSession();
        return () => window.removeEventListener('auth:expired', handleExpired);
    }, []);

    const value = useMemo(() => ({ user, status, sessionError, login, register, logout, refreshSession }), [user, status, sessionError]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
}
