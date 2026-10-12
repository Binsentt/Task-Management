import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/authApi.js';
import { env } from '../lib/env.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState('loading');

    async function refreshSession() {
        try {
            const response = await authApi.me();
            setUser(response.data.data.user);
            setStatus('authenticated');
            return response.data.data.user;
        } catch (error) {
            setUser(null);
            setStatus(error.response?.status === 401 ? 'anonymous' : 'error');
            return null;
        }
    }

    async function login(payload) {
        const response = await authApi.login(payload);
        const nextUser = response.data.data.user;
        setUser(nextUser);
        setStatus('authenticated');
        return nextUser;
    }

    async function register(payload) {
        const response = await authApi.register(payload);
        const nextUser = response.data.data.user;
        setUser(nextUser);
        setStatus('authenticated');
        return nextUser;
    }

    async function logout() {
        await authApi.logout();
        setUser(null);
        setStatus('anonymous');
    }

    useEffect(() => {
        const handleExpired = () => {
            setUser(null);
            setStatus('anonymous');
        };
        window.addEventListener('auth:expired', handleExpired);
        if (env.appEnv === 'test') setStatus('anonymous');
        else refreshSession();
        return () => window.removeEventListener('auth:expired', handleExpired);
    }, []);

    const value = useMemo(() => ({ user, status, login, register, logout, refreshSession }), [user, status]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
}