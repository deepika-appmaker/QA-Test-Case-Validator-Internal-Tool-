'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import FileUploader from '@/components/FileUploader';
import type { CSVParseResult, TestCase } from '@/types';

export default function UploadPage() {
    return (
        <ProtectedRoute>
            <UploadContent />
        </ProtectedRoute>
    );
}

function UploadContent() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
    const [hasFile, setHasFile] = useState(false);

    const handleParsed = useCallback((result: CSVParseResult) => {
        setParseResult(result);
        setHasFile(true);
    }, []);

    const handleProceed = () => {
        if (parseResult && parseResult.rows.length > 0) {
            // Store parsed data in sessionStorage for the results page
            sessionStorage.setItem(
                'qa-validator-data',
                JSON.stringify(parseResult.rows)
            );
            router.push('/results');
        }
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="border-b border-stone-200 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                            </svg>
                        </div>
                        <h1 className="text-lg font-semibold text-stone-800">QA Validator</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2">
                            {user?.photoURL && (
                                <img
                                    src={user.photoURL}
                                    alt=""
                                    className="w-7 h-7 rounded-full ring-2 ring-indigo-100"
                                />
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

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-stone-800 mb-3">
                        Upload Test Cases
                    </h2>
                    <p className="text-stone-500 max-w-lg mx-auto">
                        Upload your CSV file containing test cases. The system will validate
                        them against SOP standards.
                    </p>
                </div>

                {/* Uploader */}
                <FileUploader onParsed={handleParsed} />

                {/* Parse Results */}
                {parseResult && (
                    <div className="mt-8 space-y-4">
                        {/* Errors */}
                        {parseResult.errors.length > 0 && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
                                <p className="text-red-600 font-medium text-sm flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                    </svg>
                                    Errors Found
                                </p>
                                {parseResult.errors.map((err, i) => (
                                    <p key={i} className="text-red-500 text-sm pl-6">
                                        • {err}
                                    </p>
                                ))}
                            </div>
                        )}

                        {/* Warnings */}
                        {parseResult.warnings.length > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                                <p className="text-amber-600 font-medium text-sm flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                    </svg>
                                    Warnings
                                </p>
                                {parseResult.warnings.slice(0, 5).map((warn, i) => (
                                    <p key={i} className="text-amber-600 text-sm pl-6">
                                        • {warn}
                                    </p>
                                ))}
                                {parseResult.warnings.length > 5 && (
                                    <p className="text-amber-400 text-sm pl-6">
                                        ...and {parseResult.warnings.length - 5} more
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Success Summary */}
                        {parseResult.rows.length > 0 && parseResult.errors.length === 0 && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                        <div>
                                            <p className="text-emerald-600 font-medium text-sm">
                                                Ready to analyze
                                            </p>
                                            <p className="text-gray-500 text-xs mt-0.5">
                                                {parseResult.rows.length} test cases parsed successfully
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleProceed}
                                        className="
                      px-6 py-2.5 rounded-xl font-medium text-sm
                      bg-indigo-600 text-white
                      hover:bg-indigo-700
                      shadow-lg shadow-indigo-600/20
                      hover:shadow-xl hover:shadow-indigo-600/25
                      transition-all duration-200 hover:-translate-y-0.5
                    "
                                    >
                                        Proceed to Analysis →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Expected Format */}
                <div className="mt-16 glass-card p-6">
                    <h3 className="text-stone-600 font-medium text-sm mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                        </svg>
                        Expected CSV Format
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-stone-200">
                                    <th className="text-left px-3 py-2 text-stone-500 font-medium">Test Case ID</th>
                                    <th className="text-left px-3 py-2 text-stone-500 font-medium">Description</th>
                                    <th className="text-left px-3 py-2 text-stone-500 font-medium">Expected Result</th>
                                    <th className="text-left px-3 py-2 text-stone-500 font-medium">Priority</th>
                                    <th className="text-left px-3 py-2 text-stone-500 font-medium">Module</th>
                                </tr>
                            </thead>
                            <tbody className="text-stone-500">
                                <tr>
                                    <td className="px-3 py-2">TC001</td>
                                    <td className="px-3 py-2">Verify user can login with valid credentials</td>
                                    <td className="px-3 py-2">User is redirected to dashboard</td>
                                    <td className="px-3 py-2">High</td>
                                    <td className="px-3 py-2">Authentication</td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-2">TC002</td>
                                    <td className="px-3 py-2">Validate error message on invalid password</td>
                                    <td className="px-3 py-2">Error toast &quot;Invalid credentials&quot; is displayed</td>
                                    <td className="px-3 py-2">Medium</td>
                                    <td className="px-3 py-2">Authentication</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="text-stone-400 text-xs mt-3">
                        Required columns: <span className="text-stone-600 font-medium">Test Case ID</span>, <span className="text-stone-600 font-medium">Description</span> • Optional: Expected Result, Priority, Module
                    </p>
                </div>
            </main>
        </div>
    );
}
