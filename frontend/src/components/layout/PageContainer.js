import React from 'react';
import clsx from 'clsx';

export default function PageContainer({ children, className, maxWidth = 'max-w-7xl' }) {
    return (
        <div className={clsx('mx-auto px-6 py-8', maxWidth, className)}>
            {children}
        </div>
    );
}
