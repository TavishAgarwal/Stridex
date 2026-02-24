import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TopNavbar from '../components/layout/TopNavbar';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import { BRAND } from '../config/siteConfig';



export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('athlete');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup, loginWithGoogle, isLoggedIn, isCoach } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoggedIn) navigate(isCoach ? '/coach' : '/app', { replace: true });
    }, [isLoggedIn, isCoach, navigate]);

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
                    document.getElementById('google-signup-button'),
                    { theme: 'outline', size: 'large', width: '100%', text: 'signup_with', shape: 'rectangular' }
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
            navigate('/app');
        } catch {
            setError('Google sign-up failed. Please try again.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        setLoading(true);
        try {
            const user = await signup(email, password, name, role);
            navigate(user.role === 'coach' ? '/coach' : '/app');
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface-secondary dark:bg-[#050d1a] transition-colors duration-300">
            <TopNavbar />
            <div className="flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-md">
                    <Card className="space-y-6">
                        <div className="text-center space-y-2">
                            <span className="text-4xl">📈</span>
                            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">Join {BRAND.name}</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Create your account to get started</p>
                        </div>

                        {error && (
                            <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-2.5">
                                {error}
                            </div>
                        )}

                        {/* Google Sign-Up */}
                        <div className="flex justify-center">
                            <div id="google-signup-button" />
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-surface-border dark:bg-slate-700" />
                            <span className="text-xs text-gray-400 font-medium">OR</span>
                            <div className="flex-1 h-px bg-surface-border dark:bg-slate-700" />
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Role selector */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">I am a…</label>
                                <div className="flex rounded-xl border border-surface-border dark:border-slate-600 overflow-hidden">
                                    {['athlete', 'coach'].map(r => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setRole(r)}
                                            className={`flex-1 py-2.5 text-sm font-semibold transition-colors capitalize ${role === r
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-white dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600'
                                                }`}
                                        >
                                            {r === 'athlete' ? '🏃 Athlete' : '📋 Coach'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-surface-border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-surface-border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-surface-border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                    placeholder="At least 6 characters"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-surface-border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                    placeholder="••••••••"
                                />
                            </div>
                            <Button type="submit" variant="primary" size="lg" className="w-full justify-center">
                                Create Account
                            </Button>
                        </form>

                        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                            Already have an account?{' '}
                            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 no-underline">
                                Sign in
                            </Link>
                        </p>
                    </Card>
                </div>
            </div>
            <footer className="py-6 text-center text-sm text-gray-400 border-t border-surface-border dark:border-slate-700">
                {BRAND.copyright}
            </footer>
        </div>
    );
}
