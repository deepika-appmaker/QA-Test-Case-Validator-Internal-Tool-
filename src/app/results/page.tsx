'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import TestCaseTable from '@/components/TestCaseTable';
import ModuleSummary from '@/components/ModuleSummary';
import { validateAllTestCases } from '@/lib/rule-engine';
import {
    saveFile,
    saveTestCases,
    getFileVersion,
    getTestCasesByFile,
    saveAIResults,
    getFile
} from '@/lib/firestore';
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
    const searchParams = useSearchParams();

    const [testCases, setTestCases] = useState<TestCase[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzed, setAnalyzed] = useState(false);
    const [moduleSummary, setModuleSummary] = useState<AIModuleSummary | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Progress tracking
    const [analyzedCount, setAnalyzedCount] = useState(0);
    const [totalBatches, setTotalBatches] = useState(0);
    const [currentBatch, setCurrentBatch] = useState(0);
    const BATCH_SIZE = 12;

    // Load data from sessionStorage
    const [projectId, setProjectId] = useState<string>('default');
    const [fileId, setFileId] = useState<string | null>(null);

    // Track saving state to prevent race conditions
    const isSaving = useRef(false);

    // Visual State Calculation
    // We want to show "Analyzing" immediately if auto-run is requested, 
    // to prevent the "Run" button from flashing before the effect kicks in.
    const autoRunParam = searchParams.get('autoRun') === 'true';
    // We can't read sessionStorage synchronously in render safely for hydration, 
    // but the URL param is sufficient for the specific "Upload -> Results" flow lag.
    const isVisuallyAnalyzing = analyzing || (autoRunParam && !analyzed);

    // Initial Load Logic
    useEffect(() => {
        // Wait for auth to be ready if we need to save
        // We can load display data immediately though

        const paramFileId = searchParams.get('fileId');

        // Mode A: View History (File ID in URL)
        if (paramFileId) {
            setFileId(paramFileId);
            loadHistory(paramFileId);
            return;
        }

        // Mode B: New Upload (Session Storage)
        const storedData = sessionStorage.getItem('qa-validator-data');
        const storedMeta = sessionStorage.getItem('qa-validator-meta');

        if (storedData && storedMeta) {
            try {
                const rows: TestCase[] = JSON.parse(storedData);
                const meta = JSON.parse(storedMeta);

                if (meta.projectId) setProjectId(meta.projectId);

                // Initialize local validation
                // Only set test cases if we haven't already (to avoid reset on user auth update)
                if (testCases.length === 0) {
                    const validated = validateAllTestCases(rows);
                    setTestCases(validated);
                }

                // Auto-save as "Pending" if not already saved in this session
                // We STRICTLY need 'user' to be present to save to Firestore
                if (user && !sessionStorage.getItem('qa-file-saved') && !isSaving.current) {
                    savePendingFile(rows, meta);
                }
            } catch (err) {
                console.error('Session load error:', err);
                showToast('Failed to load session data', 'error');
            }
        }
    }, [router, user, searchParams]); // Added searchParams dependency

    const loadHistory = async (id: string) => {
        try {
            const fileRecord = await getFile(id);
            if (fileRecord) {
                if (fileRecord.summary) {
                    setModuleSummary(fileRecord.summary);
                }
                if (fileRecord.projectId) {
                    setProjectId(fileRecord.projectId);
                }
            }

            const cases = await getTestCasesByFile(id);
            setTestCases(cases);
            setAnalyzed(cases.some(c => c.aiStatus !== 'PENDING'));
            // If already analyzed (all have results), we consider it done
            if (cases.length > 0 && cases.every(c => c.aiStatus === 'PASS' || c.aiStatus === 'NEEDS_REWRITE')) {
                setAnalyzed(true);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
            showToast('Failed to load file history', 'error');
        }
    };

    const savePendingFile = async (rows: TestCase[], meta: any) => {
        if (!user || isSaving.current) return;
        isSaving.current = true;

        try {
            const version = await getFileVersion(meta.projectId, meta.fileName);
            const newFileId = await saveFile(user.uid, meta.fileName, rows.length, {
                projectId: meta.projectId,
                uploadedBy: user.email || '',
                version: version
            });

            await saveTestCases(newFileId, rows);

            setFileId(newFileId);
            sessionStorage.setItem('qa-file-saved', 'true');

            // CRITICAL: Reload history immediately to get the Firestore IDs for the test cases
            // This ensures subsequent AI updates will use IDs and not create duplicates
            await loadHistory(newFileId);

            // Optional: Update URL without reload to make it shareable immediately
            const url = new URL(window.location.href);
            url.searchParams.set('fileId', newFileId);
            window.history.replaceState({}, '', url);

            showToast('File saved to project history', 'success');
        } catch (error) {
            console.error('Failed to auto-save:', error);
            showToast('Failed to save file history', 'error');
        } finally {
            isSaving.current = false;
        }
    };

    // NOTE: Auto-trigger removed per requirement — AI runs only when user clicks "Run Review"

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

    // Module summary - moved up to be used in handleAnalyze
    const fetchModuleSummary = useCallback(async (updatedCases: TestCase[]) => {
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
                return summary;
            }
        } catch {
            // Summary is optional, fail silently
        } finally {
            setSummaryLoading(false);
        }
        return null;
    }, []);

    // Full analysis — progressive batch-by-batch from frontend
    const handleAnalyze = useCallback(async () => {
        if (analyzing) return;
        setAnalyzing(true);
        setAnalyzedCount(0);

        // Split into batches
        const currentTestCases = [...testCases];
        const batches: TestCase[][] = [];
        for (let i = 0; i < currentTestCases.length; i += BATCH_SIZE) {
            batches.push(currentTestCases.slice(i, i + BATCH_SIZE));
        }
        setTotalBatches(batches.length);
        setCurrentBatch(0);

        // Mark all as ANALYZING
        setTestCases((prev) =>
            prev.map((tc) => ({ ...tc, aiStatus: 'ANALYZING' as const, score: undefined, comment: undefined }))
        );

        let allUpdated = [...currentTestCases.map((tc) => ({ ...tc, aiStatus: 'ANALYZING' as const } as TestCase))];
        let totalPassed = 0;

        for (let b = 0; b < batches.length; b++) {
            setCurrentBatch(b + 1);
            const batch = batches[b];

            try {
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ testCases: batch }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Analysis failed');
                }

                const data: { results: AIReviewResult[]; rewrites: AIRewriteResult[] } =
                    await response.json();

                // Update test cases progressively
                allUpdated = allUpdated.map((tc) => {
                    const result = data.results.find((r) => r.testId === tc.testId);
                    if (!result) return tc;

                    const rewrite = data.rewrites.find((r) => r.testId === tc.testId);

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

                totalPassed += data.results.filter((r) => r.status === 'PASS').length;
            } catch (error) {
                // Mark this batch as ERROR
                const batchIds = new Set(batch.map((tc) => tc.testId));
                allUpdated = allUpdated.map((tc) =>
                    batchIds.has(tc.testId) && tc.aiStatus === 'ANALYZING'
                        ? { ...tc, aiStatus: 'ERROR' as const }
                        : tc
                );
                console.error(`Batch ${b + 1} failed:`, error);
            }

            // Update UI after each batch
            setTestCases([...allUpdated]);
            setAnalyzedCount((b + 1) * BATCH_SIZE > currentTestCases.length ? currentTestCases.length : (b + 1) * BATCH_SIZE);
        }

        setAnalyzed(true);
        setAnalyzing(false);
        setToast({
            message: `Analysis complete! ${totalPassed}/${currentTestCases.length} passed.`,
            type: 'success'
        });
        setTimeout(() => setToast(null), 4000);

        // Generate Module Summary first
        const summary = await fetchModuleSummary(allUpdated);

        // Update DB with results
        if (fileId) {
            const scored = allUpdated.filter(tc => tc.score != null);
            const avg = scored.length > 0
                ? Math.round(scored.reduce((sum, tc) => sum + (tc.score || 0), 0) / scored.length)
                : 0;

            // Pass the summary we just generated
            saveAIResults(fileId, allUpdated, avg, summary).catch(e => console.error('Failed to save AI results', e));
        }
    }, [analyzing, testCases, fileId, fetchModuleSummary]);

    // Auto-Run Effect
    useEffect(() => {
        const shouldAutoRun = sessionStorage.getItem('qa-auto-run') === 'true' || autoRunParam;
        if (shouldAutoRun && fileId && testCases.length > 0 && !analyzing && !analyzed) {
            console.log('Auto-running analysis for file:', fileId);
            sessionStorage.removeItem('qa-auto-run');
            handleAnalyze();
        }
    }, [fileId, testCases, analyzing, analyzed, handleAnalyze, autoRunParam]);

    // handleReAnalyze removed per requirement

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
                            onClick={() => router.push(projectId && projectId !== 'default' ? `/project/${projectId}` : '/')}
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

                {/* Run Review / Re-Analyze / Actions */}
                {/* Visual Fix: Hide button if visually analyzing (even if technically not started yet) */}
                {!isVisuallyAnalyzing && !analyzed && testCases.length > 0 && (
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={handleAnalyze}
                            className="px-6 py-3 rounded-xl font-medium text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/25 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                            </svg>
                            Run AI Review
                        </button>
                        <span className="text-xs text-stone-400">{testCases.length} test cases ready for review</span>
                    </div>
                )}

                {isVisuallyAnalyzing && (
                    <AnalysisProgress
                        analyzedCount={analyzedCount}
                        totalCount={testCases.length}
                        currentBatch={currentBatch}
                        totalBatches={totalBatches}
                    />
                )}

                {analyzed && !analyzing && (
                    <div className="flex items-center gap-4 mb-6">
                        {/* Static Mode: Re-Run hidden per requirement */}
                        {/* 
                        <button
                            onClick={handleAnalyze}
                            className="px-6 py-3 rounded-xl font-medium text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/25 hover:-translate-y-0.5 transition-all duration-200"
                        >
                            Re-Run Review
                        </button>
                        */}
                        <button
                            onClick={() => router.push('/repository')}
                            className="px-6 py-3 rounded-xl font-medium text-sm text-stone-500 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-all duration-200"
                        >
                            View Repository
                        </button>
                        <button
                            onClick={() => router.push(projectId && projectId !== 'default' ? `/upload?projectId=${projectId}` : '/upload')}
                            className="px-6 py-3 rounded-xl font-medium text-sm text-stone-500 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-all duration-200"
                        >
                            Upload New File
                        </button>
                    </div>
                )}

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
                    // onReAnalyze removed
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

// ─── Analysis Progress Panel ──────────────────────────────────────

const ANALYSIS_TIPS = [
    '💡 AI evaluates business logic correctness, SOP compliance, and language precision',
    '📊 Each test case is scored from 0–100 based on weighted quality criteria',
    '✍️ Low-confidence results will get AI-suggested rewrites automatically',
    '🔍 The AI checks for action verbs, measurable outcomes, and clear expectations',
    '🎯 Scores below 70% trigger automatic rewrite suggestions',
    '📋 Module-level summaries are generated after individual analysis completes',
    '⚡ Results stream in batch-by-batch — watch the table update in real time!',
    '🧠 The AI acts like a Senior QA Lead reviewing for clarity and automation readiness',
];

function AnalysisProgress({
    analyzedCount,
    totalCount,
    currentBatch,
    totalBatches,
}: {
    analyzedCount: number;
    totalCount: number;
    currentBatch: number;
    totalBatches: number;
}) {
    const [tipIndex, setTipIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setTipIndex((prev) => (prev + 1) % ANALYSIS_TIPS.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    const pct = totalCount > 0 ? Math.round((analyzedCount / totalCount) * 100) : 0;

    return (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-5 space-y-4 animate-in fade-in">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <span className="block w-8 h-8 rounded-lg bg-indigo-100 animate-pulse" />
                        <span className="absolute inset-0 flex items-center justify-center text-lg">✨</span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-stone-800">
                            Analyzing with AI
                        </p>
                        <p className="text-xs text-stone-500">
                            Batch {currentBatch} of {totalBatches} • {analyzedCount}/{totalCount} test cases
                        </p>
                    </div>
                </div>
                <span className="text-2xl font-bold text-indigo-600 tabular-nums">
                    {pct}%
                </span>
            </div>

            {/* Progress bar */}
            <div className="relative h-2.5 rounded-full bg-stone-200 overflow-hidden">
                <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                />
                {/* Shimmer overlay */}
                <div
                    className="absolute inset-y-0 left-0 rounded-full opacity-30 transition-all duration-700"
                    style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                        animation: 'shimmer 2s infinite',
                    }}
                />
            </div>

            {/* Rotating tip */}
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-white/60 border border-stone-100">
                <span className="text-xs text-stone-500 leading-relaxed transition-opacity duration-500" key={tipIndex}>
                    {ANALYSIS_TIPS[tipIndex]}
                </span>
            </div>

            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            `}</style>
        </div>
    );
}
