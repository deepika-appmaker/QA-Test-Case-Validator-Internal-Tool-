import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    type User,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google popup.
 * Optionally restricts login to a specific email domain.
 */
export async function signInWithGoogle(): Promise<User> {
    const auth = getFirebaseAuth();
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Optional domain restriction
    const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN;
    if (allowedDomain && user.email && !user.email.endsWith(`@${allowedDomain}`)) {
        await firebaseSignOut(auth);
        throw new Error(`Access restricted to @${allowedDomain} email addresses.`);
    }

    return user;
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
}
