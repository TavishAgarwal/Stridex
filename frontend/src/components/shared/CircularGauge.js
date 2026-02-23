import React from 'react';
import clsx from 'clsx';

const COLOR_MAP = {
    blue: { stroke: '#3b82f6', bg: '#dbeafe' },
    cyan: { stroke: '#06b6d4', bg: '#cffafe' },
    emerald: { stroke: '#10b981', bg: '#d1fae5' },
    amber: { stroke: '#f59e0b', bg: '#fef3c7' },
    red: { stroke: '#ef4444', bg: '#fee2e2' },
    purple: { stroke: '#8b5cf6', bg: '#ede9fe' },
};

export default function CircularGauge({ value = 0, max = 100, label, color = 'blue', size = 120, className }) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    const radius = (size - 16) / 2;
    const circumference = Math.PI * radius; // semicircle
    const offset = circumference - (pct / 100) * circumference;
    const colors = COLOR_MAP[color] || COLOR_MAP.blue;

    return (
        <div className={clsx('flex flex-col items-center', className)}>
            <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`} className="overflow-visible">
                {/* Background arc */}
                <path
                    d={`M 8 ${size / 2 + 8} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2 + 8}`}
                    fill="none"
                    stroke={colors.bg}
                    strokeWidth="10"
                    strokeLinecap="round"
                />
                {/* Filled arc */}
                <path
                    d={`M 8 ${size / 2 + 8} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2 + 8}`}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-1000 ease-out"
                />
                {/* Center value */}
                <text x={size / 2} y={size / 2} textAnchor="middle" className="text-3xl font-bold fill-gray-900" dy="4">
                    {value}
                </text>
            </svg>
            {label && <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mt-1">{label}</p>}
        </div>
    );
}
