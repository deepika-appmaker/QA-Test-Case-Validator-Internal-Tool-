'use client';

interface ScoreBadgeProps {
    score: number | undefined;
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
    if (score === undefined || score === null) {
        return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-stone-50 text-stone-400 border border-stone-200">
                —
            </span>
        );
    }

    let colorClasses: string;
    if (score >= 85) {
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (score >= 60) {
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    } else {
        colorClasses = 'bg-red-50 text-red-600 border-red-200';
    }

    return (
        <span
            className={`
        inline-flex items-center px-3 py-1 rounded-full
        text-xs font-bold tabular-nums border
        ${colorClasses}
      `}
        >
            {score}
        </span>
    );
}
