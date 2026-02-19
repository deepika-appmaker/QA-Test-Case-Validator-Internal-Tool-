import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    collection,
    query,
    where,
    updateDoc,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import type { TestCase, FileRecord, DailyUsage, UserProfile, UserRole } from '@/types';

// ─── Users ────────────────────────────────────────────────────────

export async function saveUser(user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}): Promise<void> {
    const db = getFirebaseDb();
    const userRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userRef);

    if (!existing.exists()) {
        await setDoc(userRef, {
            userId: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            role: 'qa',
            createdAt: Timestamp.now(),
        });
    } else {
        // Update display name and photo on each login
        await updateDoc(userRef, {
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
        });
    }
}

export async function getAllUsers(): Promise<UserProfile[]> {
    const db = getFirebaseDb();
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map((d) => ({
        userId: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
    }) as UserProfile);
}

export async function getUserRole(uid: string): Promise<UserRole | null> {
    const db = getFirebaseDb();
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return null;
    return (userDoc.data().role as UserRole) || 'qa';
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
    const db = getFirebaseDb();
    await updateDoc(doc(db, 'users', uid), { role });
}

// ─── Files ────────────────────────────────────────────────────────

export async function saveFile(
    userId: string,
    fileName: string,
    rowCount: number,
    options?: {
        projectId?: string;
        uploadedBy?: string;
        version?: number;
    }
): Promise<string> {
    const db = getFirebaseDb();
    const fileRef = await addDoc(collection(db, 'files'), {
        userId,
        fileName,
        rowCount,
        uploadDate: Timestamp.now(),
        projectId: options?.projectId || 'default',
        uploadedBy: options?.uploadedBy || '',
        version: options?.version || 1,
        aiReviewed: false,
        averageScore: null,
    });
    return fileRef.id;
}

export async function updateFile(fileId: string, updates: Partial<FileRecord>): Promise<void> {
    const db = getFirebaseDb();
    const fileRef = doc(db, 'files', fileId);
    await updateDoc(fileRef, updates);
}

export async function deleteFile(fileId: string): Promise<void> {
    const db = getFirebaseDb();
    const batch = writeBatch(db);

    // 1. Delete all test cases in subcollection
    const testCasesSnapshot = await getDocs(collection(db, 'files', fileId, 'testCases'));
    testCasesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // 2. Delete the file document itself
    const fileRef = doc(db, 'files', fileId);
    batch.delete(fileRef);

    await batch.commit();
}

/**
 * Detect the next version number for a file with the same name in the same project.
 */
export async function getFileVersion(
    projectId: string,
    fileName: string
): Promise<number> {
    const db = getFirebaseDb();
    // Simple query — no composite index needed. Filter & find max version client-side.
    const q = query(
        collection(db, 'files'),
        where('projectId', '==', projectId)
    );
    const snapshot = await getDocs(q);
    const matchingVersions = snapshot.docs
        .filter((d) => d.data().fileName === fileName)
        .map((d) => d.data().version || 0);
    if (matchingVersions.length === 0) return 1;
    return Math.max(...matchingVersions) + 1;
}

export async function getFilesByUser(userId: string): Promise<FileRecord[]> {
    const db = getFirebaseDb();
    // Simple query — no composite index needed. Sort client-side.
    const q = query(
        collection(db, 'files'),
        where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
        .map((d) => ({
            fileId: d.id,
            ...d.data(),
            uploadDate: d.data().uploadDate?.toDate(),
        }) as FileRecord)
        .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
}

export async function getFile(fileId: string): Promise<FileRecord | null> {
    const db = getFirebaseDb();
    const docRef = doc(db, 'files', fileId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return {
        fileId: snapshot.id,
        ...snapshot.data(),
        uploadDate: snapshot.data().uploadDate?.toDate(),
    } as FileRecord;
}

// ─── Test Cases ───────────────────────────────────────────────────

export async function saveTestCases(
    fileId: string,
    testCases: TestCase[]
): Promise<void> {
    const db = getFirebaseDb();
    const batch = writeBatch(db);

    for (const tc of testCases) {
        // Use testId as the document ID to prevent duplicates
        // Sanitize to ensure valid path (replace non-alphanumeric except -_ with _)
        const safeId = tc.testId.replace(/[^a-zA-Z0-9-_]/g, '_');
        const docId = safeId || doc(collection(db, 'files', fileId, 'testCases')).id; // Fallback if empty

        const tcRef = doc(db, 'files', fileId, 'testCases', docId);

        batch.set(tcRef, {
            testId: tc.testId,
            description: tc.description,
            expectedResult: tc.expectedResult,
            priority: tc.priority,
            module: tc.module,
            aiStatus: tc.aiStatus || 'PENDING',
            score: tc.score ?? null,
            comment: tc.comment || '',
            confidence: tc.confidence ?? null,
            localFlags: tc.localFlags || [],
            rewrittenDescription: tc.rewrittenDescription || '',
            rewrittenExpected: tc.rewrittenExpected || '',
            improvementReason: tc.improvementReason || '',
        }, { merge: true }); // Merge to preserve other fields if any
    }

    await batch.commit();
}

export async function getTestCasesByFile(fileId: string): Promise<TestCase[]> {
    const db = getFirebaseDb();
    const snapshot = await getDocs(
        collection(db, 'files', fileId, 'testCases')
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TestCase);
}

// ─── Daily Usage (Rate Limiting) ──────────────────────────────────

export async function getDailyUsage(userId: string): Promise<DailyUsage> {
    const db = getFirebaseDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = Timestamp.fromDate(today);

    // Count files uploaded today
    const filesQuery = query(
        collection(db, 'files'),
        where('userId', '==', userId),
        where('uploadDate', '>=', startOfDay)
    );
    const filesSnap = await getDocs(filesQuery);

    let totalRows = 0;
    for (const fileDoc of filesSnap.docs) {
        totalRows += fileDoc.data().rowCount || 0;
    }

    return {
        filesUploaded: filesSnap.size,
        rowsAnalyzed: totalRows,
    };
}

// ─── File Repository Queries ─────────────────────────────────────

export async function getFilesByProject(projectId: string): Promise<FileRecord[]> {
    const db = getFirebaseDb();
    // Single-field query — no composite index needed. Sort client-side.
    const q = query(
        collection(db, 'files'),
        where('projectId', '==', projectId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
        .map((d) => ({
            fileId: d.id,
            ...d.data(),
            uploadDate: d.data().uploadDate?.toDate(),
        }) as FileRecord)
        .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
}

export async function getAllFiles(): Promise<FileRecord[]> {
    const db = getFirebaseDb();
    // No orderBy — sort client-side to avoid index requirements.
    const snapshot = await getDocs(collection(db, 'files'));
    return snapshot.docs
        .map((d) => ({
            fileId: d.id,
            ...d.data(),
            uploadDate: d.data().uploadDate?.toDate(),
        }) as FileRecord)
        .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
}

// ─── AI Result Persistence ───────────────────────────────────────

export async function saveAIResults(
    fileId: string,
    testCases: TestCase[],
    averageScore: number | null,
    summary?: any // Ideally type this as AIModuleSummary but avoiding circular dep issues if any, or just import it 
): Promise<void> {
    const db = getFirebaseDb();
    const batch = writeBatch(db);

    // Update each test case subcollection doc
    for (const tc of testCases) {
        // Use consistent ID generation
        const safeId = tc.testId ? tc.testId.replace(/[^a-zA-Z0-9-_]/g, '_') : null;

        // If we have an ID, update the existing doc. Otherwise use testId-based ID.
        const tcRef = tc.id
            ? doc(db, 'files', fileId, 'testCases', tc.id)
            : doc(db, 'files', fileId, 'testCases', safeId || doc(collection(db, 'files', fileId, 'testCases')).id);


        batch.set(tcRef, {
            testId: tc.testId,
            description: tc.description,
            expectedResult: tc.expectedResult,
            priority: tc.priority,
            module: tc.module,
            aiStatus: tc.aiStatus || 'PENDING',
            score: tc.score ?? null,
            comment: tc.comment || '',
            confidence: tc.confidence ?? null,
            localFlags: tc.localFlags || [],
            rewrittenDescription: tc.rewrittenDescription || '',
            rewrittenExpected: tc.rewrittenExpected || '',
            improvementReason: tc.improvementReason || '',
        }, { merge: true });
    }

    await batch.commit();

    // Mark file as AI reviewed and save summary
    await updateDoc(doc(db, 'files', fileId), {
        aiReviewed: true,
        averageScore: averageScore,
        ...(summary && { summary }),
    });
}

export async function getAIResults(fileId: string): Promise<TestCase[] | null> {
    const db = getFirebaseDb();
    const snapshot = await getDocs(
        collection(db, 'files', fileId, 'testCases')
    );
    if (snapshot.empty) return null;
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TestCase);
}
