'use client';

import type { AIStatus } from '@/types';

const STATUS_CONFIG: Record<
    AIStatus,
    { label: string; bg: string; text: string; dot: string }
> = {
    PASS: {
        label: 'Pass',
        bg: 'bg-emerald-50 border-emerald-200',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
    },
    NEEDS_REWRITE: {
        label: 'Needs Rewrite',
        bg: 'bg-amber-50 border-amber-200',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
    },
    PENDING: {
        label: 'Pending',
        bg: 'bg-stone-50 border-stone-200',
        text: 'text-stone-500',
        dot: 'bg-stone-400',
    },
    ANALYZING: {
        label: 'Analyzing',
        bg: 'bg-indigo-50 border-indigo-200',
        text: 'text-indigo-600',
        dot: 'bg-indigo-500 animate-pulse',
    },
    ERROR: {
        label: 'Error',
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-600',
        dot: 'bg-red-500',
    },
};

interface StatusBadgeProps {
    status: AIStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

    return (
        <span
            className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
        text-xs font-medium border whitespace-nowrap
        ${config.bg} ${config.text}
      `}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
        </span>
    );
}
