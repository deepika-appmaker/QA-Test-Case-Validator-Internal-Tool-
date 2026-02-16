import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    collection,
    query,
    where,
    orderBy,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import type { TestCase, FileRecord, DailyUsage } from '@/types';

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
            createdAt: Timestamp.now(),
        });
    }
}

// ─── Files ────────────────────────────────────────────────────────

export async function saveFile(
    userId: string,
    fileName: string,
    rowCount: number
): Promise<string> {
    const db = getFirebaseDb();
    const fileRef = await addDoc(collection(db, 'files'), {
        userId,
        fileName,
        rowCount,
        uploadDate: Timestamp.now(),
    });
    return fileRef.id;
}

export async function getFilesByUser(userId: string): Promise<FileRecord[]> {
    const db = getFirebaseDb();
    const q = query(
        collection(db, 'files'),
        where('userId', '==', userId),
        orderBy('uploadDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
        fileId: d.id,
        ...d.data(),
        uploadDate: d.data().uploadDate?.toDate(),
    })) as FileRecord[];
}

// ─── Test Cases ───────────────────────────────────────────────────

export async function saveTestCases(
    fileId: string,
    testCases: TestCase[]
): Promise<void> {
    const db = getFirebaseDb();
    const batch = writeBatch(db);

    for (const tc of testCases) {
        const tcRef = doc(collection(db, 'files', fileId, 'testCases'));
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
        });
    }

    await batch.commit();
}

export async function getTestCasesByFile(fileId: string): Promise<TestCase[]> {
    const db = getFirebaseDb();
    const snapshot = await getDocs(
        collection(db, 'files', fileId, 'testCases')
    );
    return snapshot.docs.map((d) => d.data() as TestCase);
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
