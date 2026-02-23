import React from 'react';
import clsx from 'clsx';

const VARIANT_STYLES = {
    success: 'bg-emerald/10 text-emerald-dark border border-emerald/20',
    warning: 'bg-amber/10 text-amber-dark border border-amber/20',
    danger: 'bg-danger/10 text-danger-dark border border-danger/20',
    info: 'bg-primary-50 text-primary-700 border border-primary-200',
    neutral: 'bg-gray-100 text-gray-600 border border-gray-200',
    purple: 'bg-purple/10 text-purple-dark border border-purple/20',
};

export default function StatusBadge({ label, variant = 'neutral', className, dot }) {
    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide',
                VARIANT_STYLES[variant] || VARIANT_STYLES.neutral,
                className
            )}
        >
            {dot && <span className={clsx('w-2 h-2 rounded-full', dot)} />}
            {label}
        </span>
    );
}
