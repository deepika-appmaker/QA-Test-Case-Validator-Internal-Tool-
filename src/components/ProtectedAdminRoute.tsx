'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

/**
 * Route guard that redirects non-admin users to /upload.
 * Wraps admin-only pages (e.g. /admin).
 */
export default function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
    const { user, loading, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (!isAdmin) {
                router.push('/upload');
            }
        }
    }, [user, loading, isAdmin, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-stone-400 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user || !isAdmin) return null;

    return <>{children}</>;
}
