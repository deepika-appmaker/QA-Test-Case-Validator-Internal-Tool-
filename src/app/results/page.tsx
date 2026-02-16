'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import TestCaseTable from '@/components/TestCaseTable';
import ModuleSummary from '@/components/ModuleSummary';
import { validateAllTestCases } from '@/lib/rule-engine';
import type { TestCase, AIReviewResult, AIRewriteResult, AIModuleSummary } from '@/types';

export default function ResultsPage() {
    return (
        <ProtectedRoute>
            <ResultsContent />
        </ProtectedRoute>
    );
}

function ResultsContent() {
    const { user, signOut } = useAuth();
    const router = useRouter();

    const [testCases, setTestCases] = useState<TestCase[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzed, setAnalyzed] = useState(false);
    const [moduleSummary, setModuleSummary] = useState<AIModuleSummary | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Load data from sessionStorage
    useEffect(() => {
        const stored = sessionStorage.getItem('qa-validator-data');
        if (stored) {
            try {
                const rows: TestCase[] = JSON.parse(stored);
                // Run local validation
                const validated = validateAllTestCases(rows);
                setTestCases(validated);
            } catch {
                showToast('Failed to load test case data', 'error');
                router.push('/upload');
            }
        } else {
            router.push('/upload');
        }
    }, [router]);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Update a single test case
    const handleUpdateTestCase = useCallback(
        (index: number, updates: Partial<TestCase>) => {
            setTestCases((prev) => {
                const next = [...prev];
                next[index] = { ...next[index], ...updates };
                return next;
            });
        },
        []
    );

    // Full analysis
    const handleAnalyze = async () => {
        if (analyzing) return;
        setAnalyzing(true);

        // Mark all as ANALYZING
        setTestCases((prev) =>
            prev.map((tc) => ({ ...tc, aiStatus: 'ANALYZING' as const }))
        );

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testCases }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Analysis failed');
            }

            const data: { results: AIReviewResult[]; rewrites: AIRewriteResult[] } =
                await response.json();

            // Build updated test cases with AI results
            const updatedTestCases = testCases.map((tc) => {
                const result = data.results.find((r) => r.testId === tc.testId);
                const rewrite = data.rewrites.find((r) => r.testId === tc.testId);

                if (!result) return { ...tc, aiStatus: 'ERROR' as const };

                return {
                    ...tc,
                    aiStatus: result.status === 'PASS' ? 'PASS' : 'NEEDS_REWRITE',
                    score: result.score,
                    comment: result.reason,
                    confidence: result.confidence,
                    rewrittenDescription: rewrite?.rewrittenDescription,
                    rewrittenExpected: rewrite?.rewrittenExpected,
                    improvementReason: rewrite?.improvementReason,
                } as TestCase;
            });

            setTestCases(updatedTestCases);

            setAnalyzed(true);
            showToast(
                `Analysis complete! ${data.results.filter((r) => r.status === 'PASS').length}/${data.results.length} passed.`,
                'success'
            );

            // Trigger module summary with the updated data
            fetchModuleSummary(updatedTestCases);
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : 'Analysis failed',
                'error'
            );
            // Reset status
            setTestCases((prev) =>
                prev.map((tc) =>
                    tc.aiStatus === 'ANALYZING' ? { ...tc, aiStatus: 'ERROR' as const } : tc
                )
            );
        } finally {
            setAnalyzing(false);
        }
    };

    // Re-analyze single row
    const handleReAnalyze = async (index: number) => {
        const tc = testCases[index];

        // Mark as analyzing
        handleUpdateTestCase(index, { aiStatus: 'ANALYZING' });

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testCases: [tc] }),
            });

            if (!response.ok) {
                throw new Error('Re-analysis failed');
            }

            const data: { results: AIReviewResult[]; rewrites: AIRewriteResult[] } =
                await response.json();
            const result = data.results[0];
            const rewrite = data.rewrites[0];

            handleUpdateTestCase(index, {
                aiStatus: result
                    ? result.status === 'PASS'
                        ? 'PASS'
                        : 'NEEDS_REWRITE'
                    : 'ERROR',
                score: result?.score,
                comment: result?.reason,
                confidence: result?.confidence,
                rewrittenDescription: rewrite?.rewrittenDescription,
                rewrittenExpected: rewrite?.rewrittenExpected,
                improvementReason: rewrite?.improvementReason,
            });

            showToast(`${tc.testId} re-analyzed successfully`, 'success');
        } catch (error) {
            handleUpdateTestCase(index, { aiStatus: 'ERROR' });
            showToast('Re-analysis failed', 'error');
        }
    };

    // Module summary
    const fetchModuleSummary = async (updatedCases: TestCase[]) => {
        setSummaryLoading(true);
        try {
            const response = await fetch('/api/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testCases: updatedCases }),
            });

            if (response.ok) {
                const summary: AIModuleSummary = await response.json();
                setModuleSummary(summary);
            }
        } catch {
            // Summary is optional, fail silently
        } finally {
            setSummaryLoading(false);
        }
    };

    // Stats
    const totalRows = testCases.length;
    const passedRows = testCases.filter((tc) => tc.aiStatus === 'PASS').length;
    const rewriteRows = testCases.filter(
        (tc) => tc.aiStatus === 'NEEDS_REWRITE'
    ).length;
    const flaggedRows = testCases.filter(
        (tc) => tc.localFlags && tc.localFlags.length > 0
    ).length;
    const scoredCases = testCases.filter((tc) => tc.score !== undefined && tc.score !== null);
    const avgScore = scoredCases.length > 0
        ? Math.round(scoredCases.reduce((sum, tc) => sum + (tc.score ?? 0), 0) / scoredCases.length)
        : null;

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="border-b border-stone-200 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/upload')}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                            </svg>
                        </button>
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                            </svg>
                        </div>
                        <h1 className="text-lg font-semibold text-stone-800">
                            Test Case Results
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2">
                            {user?.photoURL && (
                                <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full ring-2 ring-indigo-100" />
                            )}
                            <span className="text-sm text-stone-500">{user?.email}</span>
                        </div>
                        <button
                            onClick={signOut}
                            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-6 py-8">
                {/* Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                    <StatCard label="Total Cases" value={totalRows} color="zinc" />
                    <StatCard label="Passed" value={passedRows} color="emerald" />
                    <StatCard label="Needs Rewrite" value={rewriteRows} color="amber" />
                    <StatCard label="Flagged (SOP)" value={flaggedRows} color="red" />
                    <StatCard label="Avg Score" value={avgScore !== null ? avgScore : '—'} color="zinc" />
                </div>

                {/* Analyze Button */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={handleAnalyze}
                        disabled={analyzing || testCases.length === 0}
                        className={`
              px-8 py-3 rounded-xl font-semibold text-sm
              transition-all duration-300
              ${analyzing
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/25 hover:-translate-y-0.5'
                            }
            `}
                    >
                        {analyzing ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                                Analyzing...
                            </span>
                        ) : analyzed ? (
                            'Re-Analyze All'
                        ) : (
                            '✨ Analyze with AI'
                        )}
                    </button>

                    {analyzed && (
                        <button
                            onClick={() => router.push('/upload')}
                            className="px-6 py-3 rounded-xl font-medium text-sm text-stone-500 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-all duration-200"
                        >
                            Upload New File
                        </button>
                    )}
                </div>

                {/* Module Summary */}
                {(moduleSummary || summaryLoading) && (
                    <div className="mb-6">
                        <ModuleSummary summary={moduleSummary} loading={summaryLoading} />
                    </div>
                )}

                {/* Table */}
                <TestCaseTable
                    testCases={testCases}
                    onUpdateTestCase={handleUpdateTestCase}
                    onReAnalyze={handleReAnalyze}
                    analyzing={analyzing}
                />
            </main>

            {/* Toast */}
            {toast && (
                <div className="fixed top-6 right-6 z-50 toast-enter">
                    <div
                        className={`
              px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-sm
              flex items-center gap-3 max-w-sm
              ${toast.type === 'success'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : toast.type === 'error'
                                    ? 'bg-red-50 border-red-200 text-red-700'
                                    : 'bg-stone-50 border-stone-200 text-stone-600'
                            }
            `}
                    >
                        {toast.type === 'success' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        ) : toast.type === 'error' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                            </svg>
                        )}
                        <span className="text-sm">{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    color,
}: {
    label: string;
    value: number | string;
    color: 'zinc' | 'emerald' | 'amber' | 'red';
}) {
    const colorMap = {
        zinc: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        amber: 'text-amber-700 bg-amber-50 border-amber-200',
        red: 'text-red-700 bg-red-50 border-red-200',
    };

    return (
        <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                {label}
            </p>
            <p className={`text-3xl font-bold tabular-nums ${colorMap[color].split(' ')[0]}`}>
                {value}
            </p>
        </div>
    );
}
