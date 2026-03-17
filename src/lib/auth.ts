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

    return user;
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
}
