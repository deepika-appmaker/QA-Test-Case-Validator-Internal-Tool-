'use client';

import type { AIModuleSummary } from '@/types';

interface ModuleSummaryProps {
    summary: AIModuleSummary | null;
    loading: boolean;
}

export default function ModuleSummary({ summary, loading }: ModuleSummaryProps) {
    if (loading) {
        return (
            <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-6 animate-pulse">
                <div className="h-5 bg-stone-100 rounded w-40 mb-4" />
                <div className="grid grid-cols-3 gap-4">
                    <div className="h-20 bg-stone-100 rounded-lg" />
                    <div className="h-20 bg-stone-100 rounded-lg" />
                    <div className="h-20 bg-stone-100 rounded-lg" />
                </div>
            </div>
        );
    }

    if (!summary) return null;

    const readinessColor =
        summary.automationReadiness === 'High'
            ? 'text-emerald-600'
            : summary.automationReadiness === 'Medium'
                ? 'text-amber-600'
                : 'text-red-600';

    return (
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-6">
            <h3 className="text-stone-700 font-semibold text-base mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
                Module Summary
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {/* Average Score */}
                <div className="rounded-lg bg-stone-50 p-4 border border-stone-200">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Avg Score</p>
                    <p className={`text-2xl font-bold tabular-nums ${summary.averageScore >= 85
                        ? 'text-emerald-600'
                        : summary.averageScore >= 60
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}>
                        {summary.averageScore.toFixed(1)}
                    </p>
                </div>

                {/* Rewrite % */}
                <div className="rounded-lg bg-stone-50 p-4 border border-stone-200">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Rewrite Rate</p>
                    <p className="text-2xl font-bold tabular-nums text-amber-600">
                        {summary.rewritePercentage.toFixed(1)}%
                    </p>
                </div>

                {/* Automation Readiness */}
                <div className="rounded-lg bg-stone-50 p-4 border border-stone-200">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Automation Ready</p>
                    <p className={`text-2xl font-bold ${readinessColor}`}>
                        {summary.automationReadiness}
                    </p>
                </div>
            </div>

            {/* Main Issues */}
            {summary.mainIssues && summary.mainIssues.length > 0 && (
                <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Top Issues</p>
                    <div className="flex flex-wrap gap-2">
                        {summary.mainIssues.map((issue, i) => (
                            <span
                                key={i}
                                className="px-3 py-1.5 rounded-lg text-xs bg-red-50 text-red-600 border border-red-200"
                            >
                                {issue}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
