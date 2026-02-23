import React from 'react';
import clsx from 'clsx';

const COLOR_MAP = {
    blue: 'bg-primary-500',
    cyan: 'bg-cyan',
    emerald: 'bg-emerald',
    amber: 'bg-amber',
    red: 'bg-danger',
    purple: 'bg-purple',
};

const BG_MAP = {
    blue: 'bg-primary-100',
    cyan: 'bg-cyan-light/20',
    emerald: 'bg-emerald/10',
    amber: 'bg-amber/10',
    red: 'bg-danger/10',
    purple: 'bg-purple/10',
};

export default function ProgressBar({ value = 0, max = 100, color = 'blue', showLabel, height = 'h-2', className }) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <div className={clsx('w-full', className)}>
            {showLabel && (
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{value}</span>
                    <span>MAX: {max}</span>
                </div>
            )}
            <div className={clsx('w-full rounded-full overflow-hidden', height, BG_MAP[color] || BG_MAP.blue)}>
                <div
                    className={clsx('h-full rounded-full transition-all duration-700 ease-out', COLOR_MAP[color] || COLOR_MAP.blue)}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}
