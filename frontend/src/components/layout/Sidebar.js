import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SIDEBAR_NAV, SIDEBAR_SYSTEM_NAV } from '../../config/siteConfig';
import clsx from 'clsx';

export default function Sidebar() {
    const location = useLocation();

    const NavItem = ({ item, forceInactive = false }) => {
        const isActive = !forceInactive && location.pathname === item.href;
        return (
            <Link
                to={item.href}
                className={clsx(
                    'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 no-underline',
                    isActive
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-200'
                )}
            >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
            </Link>
        );
    };

    return (
        <aside className="w-56 min-h-[calc(100vh-57px)] sticky top-[57px] bg-white dark:bg-[#050d1a] border-r border-surface-border dark:border-slate-700/50 flex flex-col py-6 px-4 transition-colors duration-300">
            {/* Nav */}
            <nav className="flex-1 space-y-1">
                {SIDEBAR_NAV.map((item) => (
                    <NavItem key={item.id} item={item} />
                ))}

                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-4 pt-6 pb-2">System</p>
                {SIDEBAR_SYSTEM_NAV.map((item) => (
                    <NavItem key={item.id} item={item} forceInactive={true} />
                ))}
            </nav>
        </aside>
    );
}
