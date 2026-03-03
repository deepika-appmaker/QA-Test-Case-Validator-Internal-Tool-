'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import FileUploader from '@/components/FileUploader';
import CSVPreviewTable from '@/components/CSVPreviewTable';
import ProjectSelector from '@/components/ProjectSelector';
import type { CSVParseResult, XLSXParseResult } from '@/types';

export default function UploadPage() {
    return (
        <ProtectedRoute>
            <UploadContent />
        </ProtectedRoute>
    );
}

function UploadContent() {
    const { user, isAdmin } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultProjectId = searchParams.get('projectId');

    // File state
    const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
    const [xlsxResult, setXlsxResult] = useState<XLSXParseResult | null>(null);
    const [activeSheetIndex, setActiveSheetIndex] = useState(0);

    const hasFile = !!(parseResult || xlsxResult);
    const uploadedFileName = parseResult ? 'Parsed CSV' : xlsxResult?.fileName || '';

    // Project state
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(defaultProjectId);
    const [selectedProjectName, setSelectedProjectName] = useState<string>('');
    const [guidelinesOpen, setGuidelinesOpen] = useState(false);

    useEffect(() => {
        if (defaultProjectId) setSelectedProjectId(defaultProjectId);
    }, [defaultProjectId]);

    const handleParsed = useCallback((result: CSVParseResult, fileName: string) => {
        setParseResult(result);
        setXlsxResult(null);
        setActiveSheetIndex(0);
    }, []);

    const handleXLSXParsed = useCallback((result: XLSXParseResult) => {
        setXlsxResult(result);
        setParseResult(null);
        setActiveSheetIndex(0);
    }, []);

    const handleProjectSelect = useCallback((projectId: string, projectName: string) => {
        setSelectedProjectId(projectId);
        setSelectedProjectName(projectName);
    }, []);

    const handleProceed = () => {
        if (!selectedProjectId) {
            alert('Please select a project to upload to.');
            return;
        }

        if (xlsxResult) {
            // Multi-sheet XLSX flow
            const validSheets = xlsxResult.sheets.filter(s => s.parseResult.rows.length > 0);
            if (validSheets.length === 0) {
                alert('No valid test cases found in the XLSX file.');
                return;
            }
            sessionStorage.setItem('qa-validator-xlsx-sheets', JSON.stringify(validSheets));
            sessionStorage.setItem('qa-file-type', 'xlsx');
            sessionStorage.setItem('qa-validator-meta', JSON.stringify({
                projectId: selectedProjectId,
                projectName: selectedProjectName || 'Legacy / Default',
                fileName: xlsxResult.fileName,
            }));
            sessionStorage.setItem('qa-auto-run', 'true');
            sessionStorage.removeItem('qa-file-saved');
            router.push('/results?autoRun=true');
        } else if (parseResult && parseResult.rows.length > 0) {
            // Single CSV flow (unchanged)
            sessionStorage.setItem('qa-validator-data', JSON.stringify(parseResult.rows));
            sessionStorage.setItem('qa-file-type', 'csv');
            sessionStorage.setItem('qa-validator-meta', JSON.stringify({
                projectId: selectedProjectId,
                projectName: selectedProjectName || 'Legacy / Default',
                fileName: uploadedFileName || `upload_${Date.now()}.csv`,
            }));
            sessionStorage.setItem('qa-auto-run', 'true');
            sessionStorage.removeItem('qa-file-saved');
            router.push('/results?autoRun=true');
        }
    };

    const handleDownloadTemplate = () => {
        const headers = 'Test Case ID,Description,Expected Result,Priority,Module';
        const row1 = 'TC001,Verify user can login with valid credentials,User is redirected to dashboard,High,Auth';
        const row2 = 'TC002,Verify invalid password error,Error message "Invalid credentials" shown,High,Auth';
        const csv = [headers, row1, row2].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qa-test-case-template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Compute active preview
    const activePreview = xlsxResult
        ? xlsxResult.sheets[activeSheetIndex]?.parseResult
        : parseResult;

    const totalRows = xlsxResult
        ? xlsxResult.sheets.reduce((sum, s) => sum + s.parseResult.rows.length, 0)
        : (parseResult?.rows.length || 0);

    const hasErrors = xlsxResult
        ? xlsxResult.sheets.some(s => s.parseResult.errors.length > 0)
        : (parseResult?.errors?.length ?? 0) > 0;

    return (
        <div className="min-h-screen bg-stone-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                            </svg>
                        </div>
                        <h1 className="text-lg font-bold text-stone-800 tracking-tight">Upload Test Cases</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleDownloadTemplate}
                            className="hidden sm:flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            CSV Template
                        </button>
                        <div className="w-px h-6 bg-stone-200" />
                        <button onClick={() => router.push('/')} className="text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors">
                            Dashboard
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">

                {/* Upload Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200 overflow-hidden ring-1 ring-stone-900/5">
                    {/* Project Selector */}
                    <div className="px-8 py-6 border-b border-stone-100 bg-stone-50/50 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                            <ProjectSelector
                                selectedProjectId={selectedProjectId}
                                onSelect={handleProjectSelect}
                                embedded={true}
                            />
                        </div>
                        <div className="hidden md:block w-px h-10 bg-stone-200 mx-4"></div>
                        <div className="flex items-center gap-6 text-xs text-stone-500 font-medium">
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Required: ID, Description, Priority
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                XLSX: Each sheet = one module
                            </span>
                        </div>
                    </div>

                    {/* File Drop Zone */}
                    <div className="p-8 md:p-12">
                        <FileUploader
                            onParsed={handleParsed}
                            onXLSXParsed={handleXLSXParsed}
                            compact={!!hasFile}
                        />

                        {/* Guidelines Accordion */}
                        {!hasFile && (
                            <div className="mt-8 pt-8 border-t border-stone-100">
                                <button
                                    onClick={() => setGuidelinesOpen(!guidelinesOpen)}
                                    className="flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-indigo-600 transition-colors mx-auto"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform ${guidelinesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                    {guidelinesOpen ? 'Hide Import Guidelines' : 'View Import Guidelines & Validation Rules'}
                                </button>

                                {guidelinesOpen && (
                                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-stone-800 flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">1</span>
                                                Mandatory Columns (per sheet)
                                            </h4>
                                            <ul className="space-y-2 pl-8 text-stone-600 list-disc marker:text-stone-300">
                                                <li><span className="font-mono text-xs bg-stone-100 px-1 py-0.5 rounded">Test Case ID</span> — Unique ID (e.g., TC001)</li>
                                                <li><span className="font-mono text-xs bg-stone-100 px-1 py-0.5 rounded">Description</span> — Actionable test scenario</li>
                                                <li><span className="font-mono text-xs bg-stone-100 px-1 py-0.5 rounded">Expected Result</span> — Pass criteria</li>
                                                <li><span className="font-mono text-xs bg-stone-100 px-1 py-0.5 rounded">Priority</span> — High / Medium / Low</li>
                                            </ul>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-stone-800 flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">2</span>
                                                XLSX Multi-Sheet Tips
                                            </h4>
                                            <ul className="space-y-2 pl-8 text-stone-600 list-disc marker:text-stone-300">
                                                <li>Each sheet name becomes the module name</li>
                                                <li>Each sheet is reviewed and saved separately</li>
                                                <li>Navigate between modules in results view</li>
                                                <li>Max 500 rows per sheet</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview Section */}
                {hasFile && activePreview && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">

                            {/* Header row with sheet tabs (XLSX) or title (CSV) */}
                            <div className="p-6 md:p-8 pb-0">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-stone-800">File Preview</h3>
                                        {xlsxResult ? (
                                            <p className="text-stone-500 text-sm">
                                                {xlsxResult.sheets.length} sheet{xlsxResult.sheets.length !== 1 ? 's' : ''} · {totalRows} total rows
                                            </p>
                                        ) : (
                                            <p className="text-stone-500 text-sm">
                                                {activePreview.rows.length} rows · {activePreview.errors.length} errors
                                            </p>
                                        )}
                                    </div>

                                    {/* Proceed Button */}
                                    {totalRows > 0 && !hasErrors && (
                                        <button
                                            onClick={handleProceed}
                                            className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                                            </svg>
                                            {xlsxResult
                                                ? `Run AI Review (${xlsxResult.sheets.length} modules)`
                                                : 'Run AI Review'
                                            }
                                        </button>
                                    )}
                                </div>

                                {/* Sheet Tab Navigator (XLSX only) */}
                                {xlsxResult && xlsxResult.sheets.length > 1 && (
                                    <div className="flex gap-1 overflow-x-auto pb-2 border-b border-stone-100">
                                        {xlsxResult.sheets.map((sheet, i) => {
                                            const hasErr = sheet.parseResult.errors.length > 0;
                                            return (
                                                <button
                                                    key={sheet.sheetName}
                                                    onClick={() => setActiveSheetIndex(i)}
                                                    className={`shrink-0 px-4 py-2 text-sm font-medium rounded-t-lg transition-all flex items-center gap-2 ${i === activeSheetIndex
                                                            ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                                                            : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                                                        }`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                                                    </svg>
                                                    {sheet.sheetName}
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${hasErr ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-500'}`}>
                                                        {hasErr ? '!' : sheet.parseResult.rows.length}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Active sheet preview table */}
                            <div className="p-6 md:p-8 pt-4">
                                {activePreview.errors.length > 0 ? (
                                    <div className="space-y-2">
                                        {activePreview.errors.map((err, i) => (
                                            <div key={i} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                                                {err}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <CSVPreviewTable result={activePreview} />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
