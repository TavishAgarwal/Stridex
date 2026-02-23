import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TopNavbar from '../components/layout/TopNavbar';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import { BRAND } from '../config/siteConfig';



export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, loginWithGoogle, isLoggedIn } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoggedIn) navigate('/dashboard', { replace: true });
    }, [isLoggedIn, navigate]);

    // Initialize Google Sign-In
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.google) {
                window.google.accounts.id.initialize({
                    client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '872839071294-blnf7sl4s8c3o33r1bmknl66dn44q9ks.apps.googleusercontent.com',
                    callback: handleGoogleResponse,
                });
                window.google.accounts.id.renderButton(
                    document.getElementById('google-signin-button'),
                    { theme: 'outline', size: 'large', width: '100%', text: 'signin_with', shape: 'rectangular' }
                );
            }
        };
        document.head.appendChild(script);
        return () => { try { document.head.removeChild(script); } catch { } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleGoogleResponse = (response) => {
        try {
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            loginWithGoogle({ email: payload.email, name: payload.name, picture: payload.picture });
            navigate('/dashboard');
        } catch {
            setError('Google sign-in failed. Please try again.');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password) { setError('Please fill in all fields.'); return; }
        try {
            login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-surface-secondary">
            <TopNavbar />
            <div className="flex items-center justify-center py-16 px-4">
                <div className="w-full max-w-md">
                    <Card className="space-y-6">
                        <div className="text-center space-y-2">
                            <span className="text-4xl">📈</span>
                            <h1 className="text-2xl font-extrabold text-gray-900">{BRAND.name}</h1>
                            <p className="text-sm text-gray-500">Sign in to your account</p>
                        </div>

                        {error && (
                            <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-2.5">
                                {error}
                            </div>
                        )}

                        {/* Google Sign-In */}
                        <div className="flex justify-center">
                            <div id="google-signin-button" />
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-surface-border" />
                            <span className="text-xs text-gray-400 font-medium">OR</span>
                            <div className="flex-1 h-px bg-surface-border" />
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-surface-border bg-white text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-surface-border bg-white text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <Button type="submit" variant="primary" size="lg" className="w-full justify-center">
                                Sign In
                            </Button>
                        </form>

                        <p className="text-center text-sm text-gray-500">
                            Don't have an account?{' '}
                            <Link to="/signup" className="font-semibold text-primary-600 hover:text-primary-700 no-underline">
                                Sign up
                            </Link>
                        </p>
                    </Card>
                </div>
            </div>
            <footer className="py-6 text-center text-sm text-gray-400 border-t border-surface-border">
                {BRAND.copyright}
            </footer>
        </div>
    );
}
