import React from 'react';
import clsx from 'clsx';
import StatusBadge from './StatusBadge';

export default function MetricCard({ label, value, unit, status, statusVariant, children, className }) {
    return (
        <div className={clsx('space-y-1', className)}>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{value}</span>
                {unit && <span className="text-lg text-gray-400">{unit}</span>}
                {status && <StatusBadge label={status} variant={statusVariant || 'success'} />}
            </div>
            {children}
        </div>
    );
}
