import React from 'react';
import clsx from 'clsx';

export default function SectionHeader({ icon, title, rightContent, className }) {
    return (
        <div className={clsx('flex items-center justify-between', className)}>
            <div className="flex items-center gap-2.5">
                {icon && <span className="text-xl">{icon}</span>}
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            </div>
            {rightContent && <div>{rightContent}</div>}
        </div>
    );
}
