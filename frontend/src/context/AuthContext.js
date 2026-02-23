import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

function getStoredUsers() {
    try { return JSON.parse(localStorage.getItem('stridex_users') || '[]'); }
    catch { return []; }
}

function storeUsers(users) {
    localStorage.setItem('stridex_users', JSON.stringify(users));
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const saved = localStorage.getItem('stridex_user');
        if (saved) {
            try { setUser(JSON.parse(saved)); } catch { /* ignore */ }
        }
    }, []);

    const signup = useCallback((email, password, name) => {
        const users = getStoredUsers();
        if (users.find(u => u.email === email)) {
            throw new Error('An account with this email already exists.');
        }
        const newUser = { email, password, name: name || email.split('@')[0], role: 'athlete' };
        users.push(newUser);
        storeUsers(users);
        const session = { email: newUser.email, name: newUser.name, role: newUser.role };
        setUser(session);
        localStorage.setItem('stridex_user', JSON.stringify(session));
        return session;
    }, []);

    const login = useCallback((email, password) => {
        const users = getStoredUsers();
        const found = users.find(u => u.email === email && u.password === password);
        if (!found) {
            throw new Error('Invalid email or password. Please sign up first.');
        }
        const session = { email: found.email, name: found.name, role: found.role };
        setUser(session);
        localStorage.setItem('stridex_user', JSON.stringify(session));
        return session;
    }, []);

    const loginWithGoogle = useCallback((googleUser) => {
        // googleUser has { email, name, picture }
        const users = getStoredUsers();
        let found = users.find(u => u.email === googleUser.email);
        if (!found) {
            // Auto-register Google users
            found = { email: googleUser.email, password: '__google__', name: googleUser.name, role: 'athlete', picture: googleUser.picture };
            users.push(found);
            storeUsers(users);
        }
        const session = { email: found.email, name: found.name || googleUser.name, role: found.role, picture: googleUser.picture || found.picture };
        setUser(session);
        localStorage.setItem('stridex_user', JSON.stringify(session));
        return session;
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('stridex_user');
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, signup, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
