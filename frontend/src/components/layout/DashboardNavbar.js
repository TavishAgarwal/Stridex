import React from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '../../config/siteConfig';
import StatusBadge from '../shared/StatusBadge';

export default function DashboardNavbar({ statusLabel, statusVariant, navItems, userName, userAvatar }) {
    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-border">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-3 no-underline">
                    <span className="text-2xl">📈</span>
                    <span className="text-xl font-extrabold text-gradient-blue">{BRAND.name}</span>
                    {statusLabel && (
                        <StatusBadge
                            label={statusLabel}
                            variant={statusVariant || 'info'}
                            dot={statusVariant === 'success' ? 'bg-emerald' : undefined}
                        />
                    )}
                </Link>

                {/* Center nav items */}
                <div className="hidden md:flex items-center gap-6">
                    {navItems?.map((item) => (
                        <Link
                            key={item.label}
                            to={item.href}
                            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors no-underline"
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* User */}
                <div className="flex items-center gap-3">
                    {userName && (
                        <>
                            <span className="text-sm font-medium text-gray-700">{userName}</span>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber to-amber-light flex items-center justify-center text-white text-xs font-bold">
                                {userAvatar || userName?.charAt(0)}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
