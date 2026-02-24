import React from 'react';
import clsx from 'clsx';

const GLOW_MAP = {
    red: 'border-l-danger shadow-glow-red',
    amber: 'border-l-amber shadow-glow-amber',
    emerald: 'border-l-emerald shadow-glow-emerald',
    blue: 'border-l-primary-500 shadow-glow-blue',
    purple: 'border-l-purple shadow-glow-purple',
    cyan: 'border-l-cyan shadow-glow-cyan',
};

export default function Card({ children, className, glowColor, noPadding, onClick }) {
    return (
        <div
            onClick={onClick}
            className={clsx(
                'bg-white dark:bg-slate-800 rounded-2xl shadow-glass dark:shadow-none border border-surface-border dark:border-slate-700 transition-all duration-300',
                glowColor && `border-l-4 ${GLOW_MAP[glowColor] || ''}`,
                !noPadding && 'p-6',
                onClick && 'cursor-pointer hover:shadow-glass-lg',
                className
            )}
        >
            {children}
        </div>
    );
}
