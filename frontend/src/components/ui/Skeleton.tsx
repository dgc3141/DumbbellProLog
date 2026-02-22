import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
    theme?: 'light' | 'dark';
}

export function Skeleton({ className = '', theme = 'dark', ...props }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse rounded-md ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                } ${className}`}
            {...props}
        />
    );
}
