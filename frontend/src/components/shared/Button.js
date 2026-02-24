import React from 'react';
import clsx from 'clsx';

const VARIANT_STYLES = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg',
    secondary: 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 hover:border-gray-400 dark:hover:border-slate-500',
    ghost: 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-200',
    danger: 'bg-danger text-white hover:bg-danger-dark shadow-md',
    success: 'bg-emerald text-white hover:bg-emerald-dark shadow-md',
};

const SIZE_STYLES = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
};

export default function Button({ children, variant = 'primary', size = 'md', icon, iconRight, disabled, onClick, className, type = 'button' }) {
    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            className={clsx(
                'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200',
                VARIANT_STYLES[variant] || VARIANT_STYLES.primary,
                SIZE_STYLES[size] || SIZE_STYLES.md,
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
        >
            {icon && <span className="text-lg">{icon}</span>}
            {children}
            {iconRight && <span className="text-lg">{iconRight}</span>}
        </button>
    );
}
