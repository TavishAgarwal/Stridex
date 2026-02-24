import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config/siteConfig';

const AuthContext = createContext(null);

const TOKEN_KEY = 'stridex_token';
const USER_KEY = 'stridex_user';

// ── helpers ──────────────────────────────────────────────────────────────────
function saveSession(token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem('stridex_sessions');
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Restore session on mount
    useEffect(() => {
        const savedUser = localStorage.getItem(USER_KEY);
        const savedToken = localStorage.getItem(TOKEN_KEY);
        if (savedUser) {
            try { setUser(JSON.parse(savedUser)); } catch { /* ignore */ }
        }
        if (savedToken) setToken(savedToken);
        setAuthLoading(false);
    }, []);

    // ── Signup (backend) ─────────────────────────────────────────────────────
    const signup = useCallback(async (email, password, name, role = 'athlete') => {
        const res = await axios.post(`${BACKEND_URL}/auth/signup`, { email, password, name, role });
        const data = res.data;
        setUser(data.user);
        setToken(data.token);
        saveSession(data.token, data.user);
        return data.user;
    }, []);

    // ── Login (backend) ──────────────────────────────────────────────────────
    const login = useCallback(async (email, password) => {
        const res = await axios.post(`${BACKEND_URL}/auth/login`, { email, password });
        const data = res.data;
        setUser(data.user);
        setToken(data.token);
        saveSession(data.token, data.user);
        return data.user;
    }, []);

    // ── Google login (guest-style, stored locally) ───────────────────────────
    const loginWithGoogle = useCallback((googleUser) => {
        const session = {
            email: googleUser.email,
            name: googleUser.name,
            role: 'athlete',
            picture: googleUser.picture,
            isGoogle: true,
        };
        setUser(session);
        setToken(null);
        saveSession(null, session);
        return session;
    }, []);

    // ── Guest login (no backend, no persistence) ─────────────────────────────
    const loginAsGuest = useCallback(() => {
        const guest = { email: 'guest@stridex.ai', name: 'Guest', role: 'athlete', isGuest: true };
        setUser(guest);
        setToken(null);
        // NOT saved to localStorage intentionally
    }, []);

    // ── Logout ───────────────────────────────────────────────────────────────
    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        clearSession();
    }, []);

    // ── Auth header helper ───────────────────────────────────────────────────
    const authHeader = useCallback(() => {
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, [token]);

    return (
        <AuthContext.Provider value={{
            user,
            token,
            authLoading,
            isLoggedIn: !!user,
            isGuest: !!user?.isGuest,
            isCoach: user?.role === 'coach',
            isAthlete: user?.role === 'athlete' || !!user?.isGuest,
            login,
            signup,
            loginWithGoogle,
            loginAsGuest,
            logout,
            authHeader,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
