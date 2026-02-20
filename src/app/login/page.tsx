'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { signInWithGoogle } from '@/lib/auth';

export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [signingIn, setSigningIn] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (!loading && user) {
            router.push('/');
        }
    }, [user, loading, router]);

    const handleSignIn = async () => {
        setError(null);
        setSigningIn(true);
        try {
            await signInWithGoogle();
            router.push('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign in');
        } finally {
            setSigningIn(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="glass-card w-full max-w-md p-8 space-y-8">
                {/* Logo / Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/20">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-8 h-8 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-stone-800">
                        QA Test Case Validator
                    </h1>
                    <p className="text-stone-500 text-sm max-w-xs mx-auto">
                        AI-powered validation for your QA test cases. Upload, analyze, and
                        improve in seconds.
                    </p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-stone-200" />
                    <span className="text-stone-400 text-xs uppercase tracking-wider">
                        Sign in to continue
                    </span>
                    <div className="flex-1 h-px bg-stone-200" />
                </div>

                {/* Google Sign In */}
                <button
                    onClick={handleSignIn}
                    disabled={signingIn || loading}
                    className="
            w-full flex items-center justify-center gap-3 px-6 py-3.5
            rounded-xl font-medium text-sm
            bg-indigo-600 text-white
            hover:bg-indigo-700 active:bg-indigo-800
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            shadow-lg shadow-indigo-600/20
            hover:shadow-xl hover:shadow-indigo-600/25
            hover:-translate-y-0.5
          "
                >
                    {signingIn ? (
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                    )}
                    {signingIn ? 'Signing in...' : 'Continue with Google'}
                </button>

                {/* Error */}
                {error && (
                    <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                        <p className="text-red-600 text-sm text-center">{error}</p>
                    </div>
                )}

                {/* Footer */}
                <p className="text-center text-stone-400 text-xs">
                    Internal tool • Authorized personnel only
                </p>
            </div>
        </div>
    );
}
