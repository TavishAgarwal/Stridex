export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export const BRAND = {
    name: 'STRIDEX-AI',
    tagline: 'Advanced Biomechanical Injury Risk Detection',
    copyright: `© ${new Date().getFullYear()} STRIDEX-AI • Built with ❤️ for Athletes`,
};

export const NAV_LINKS = [
    { label: 'Features', href: '/#features' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'About', href: '/#about' },
];

export const RISK_LEVELS = [
    { id: 'high', label: 'HIGH RISK (≥70%)', description: 'Immediate action required', color: 'danger', dot: 'bg-danger' },
    { id: 'medium', label: 'MEDIUM RISK (40-69%)', description: 'Close monitoring needed', color: 'amber', dot: 'bg-amber' },
    { id: 'low', label: 'LOW RISK (<40%)', description: 'Normal range - continue', color: 'emerald', dot: 'bg-emerald' },
];

export const AI_FEATURES = [
    { icon: '✨', label: 'Knee valgus detection' },
    { icon: '⚖️', label: 'Stride asymmetry analysis' },
    { icon: '🎯', label: 'Posture alignment check' },
    { icon: '📡', label: 'Real-time processing' },
    { icon: '📈', label: 'Confidence scoring' },
];

export const PRO_TIPS = [
    { icon: '🎥', label: 'Use front or side view for best results' },
    { icon: '💡', label: 'Ensure good lighting' },
    { icon: '👤', label: 'Full body must be visible' },
];

export const FEATURE_PILLS = [
    { icon: '🚀', label: 'AI-Powered Analysis' },
    { icon: '📹', label: 'Video-Only Detection' },
    { icon: '⚡', label: 'Real-Time Insights' },
];

export const INFO_CARDS = [
    {
        icon: '⚡',
        title: 'Processing Speed',
        description: 'Analysis typically completes in under 30 seconds for 1-minute clips.',
        iconBg: 'bg-primary-50 text-primary-600',
    },
    {
        icon: '🛡️',
        title: 'Data Privacy',
        description: 'Your biometric data is encrypted end-to-end and stored securely.',
        iconBg: 'bg-purple/10 text-purple',
    },
];

export const MODE_TABS = [
    { id: 'video', label: 'Video Analysis', icon: '🎬' },
    { id: 'camera', label: 'Live Camera', icon: '📷' },
    { id: 'compare', label: 'Compare Videos', icon: '⇋' },
];

export const SIDEBAR_NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/dashboard' },
    { id: 'sessions', label: 'Sessions', icon: '📋', href: '/sessions' },
    { id: 'analysis', label: 'Analysis', icon: '🔬', href: '/analysis' },
    { id: 'reports', label: 'Reports', icon: '📄', href: '/reports' },
];

export const SIDEBAR_SYSTEM_NAV = [
    { id: 'settings', label: 'Settings', icon: '⚙️', href: '/dashboard' },
    { id: 'help', label: 'Help & Support', icon: '❓', href: '/dashboard' },
];
