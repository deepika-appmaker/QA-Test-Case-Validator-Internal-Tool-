'use client';

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { signOut as authSignOut } from '@/lib/auth';
import { saveUser, getUserRole } from '@/lib/firestore';
import type { UserRole } from '@/types';

// Super-admin emails from env (comma-separated) — these are always admin regardless of Firestore
const SUPER_ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

function isSuperAdmin(email: string | null): boolean {
    if (!email) return false;
    return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    role: UserRole;
    isAdmin: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    role: 'qa',
    isAdmin: false,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<UserRole>('qa');

    useEffect(() => {
        // Only initialize on client side
        if (typeof window === 'undefined') {
            setLoading(false);
            return;
        }

        const auth = getFirebaseAuth();
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // Save/update user profile on each login
                try {
                    await saveUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                    });
                } catch (error) {
                    console.error('Failed to save user profile:', error);
                }

                // Determine role: super-admin env override, then Firestore
                if (isSuperAdmin(firebaseUser.email)) {
                    setRole('admin');
                } else {
                    try {
                        const firestoreRole = await getUserRole(firebaseUser.uid);
                        setRole(firestoreRole || 'qa');
                    } catch {
                        setRole('qa');
                    }
                }
            } else {
                setRole('qa');
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSignOut = async () => {
        await authSignOut();
        setUser(null);
        setRole('qa');
    };

    return (
        <AuthContext.Provider value={{ user, loading, role, isAdmin: role === 'admin', signOut: handleSignOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
