import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BRAND } from '../../config/siteConfig';
import { useAuth } from '../../context/AuthContext';
import Button from '../shared/Button';

export default function TopNavbar() {
    const { isLoggedIn, user, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-border">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 no-underline">
                    <span className="text-2xl">📈</span>
                    <span className="text-xl font-extrabold text-gradient-blue">{BRAND.name}</span>
                </Link>

                {/* Auth area */}
                <div className="flex items-center gap-3">
                    {isLoggedIn ? (
                        <>
                            <span className="text-sm font-medium text-gray-600 hidden sm:inline">
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
