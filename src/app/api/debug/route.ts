
import { NextResponse } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
        return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }

    try {
        const db = getFirebaseDb();
        const snapshot = await getDocs(collection(db, 'files', fileId, 'testCases'));

        const testCases: any[] = [];
        snapshot.forEach(doc => {
            testCases.push({ id: doc.id, ...doc.data() });
        });


        // Find duplicates based on testId
        const seen = new Set();
        const duplicates: any[] = [];
        const unique: any[] = [];

        for (const tc of testCases) {
            if (seen.has(tc.testId)) {
                duplicates.push(tc);
            } else {
                seen.add(tc.testId);
                unique.push(tc);
            }
        }

        // Only delete if 'fix=true' is passed
        const fix = searchParams.get('fix') === 'true';
        let deletedCount = 0;

        if (fix && duplicates.length > 0) {
            for (const dup of duplicates) {
                await deleteDoc(doc(db, 'files', fileId, 'testCases', dup.id));
                deletedCount++;
            }
        }

        return NextResponse.json({
            fileId,
            totalDocs: snapshot.size,
            uniqueCount: unique.length,
            duplicateCount: duplicates.length,
            duplicates: duplicates.map(d => ({ id: d.id, testId: d.testId })),
            fixed: fix,
            deletedCount
        });
    } catch (error: any) {
        console.error('Debug API Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
