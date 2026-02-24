import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BRAND } from '../../config/siteConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Button from '../shared/Button';

export default function TopNavbar() {
    const { isLoggedIn, user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    return (
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#050d1a]/90 backdrop-blur-md border-b border-surface-border dark:border-slate-700/50 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 no-underline">
                    <span className="text-2xl">📈</span>
                    <span className="text-xl font-extrabold text-gradient-blue">{BRAND.name}</span>
                </Link>

                {/* Auth area + Theme Toggle */}
                <div className="flex items-center gap-3">
                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all duration-200"
                        aria-label="Toggle theme"
                        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {theme === 'dark' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>

                    {isLoggedIn ? (
                        <>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 hidden sm:inline">
                                {user?.picture && (
                                    <img src={user.picture} alt="" className="w-6 h-6 rounded-full inline mr-2 align-middle" />
                                )}
                                {user?.name}
                            </span>
                            <Button variant="primary" size="sm" onClick={() => navigate('/dashboard')}>
                                Dashboard
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => { logout(); navigate('/'); }}>
                                Logout
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>
                                Login
                            </Button>
                            <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>
                                Get Started
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
