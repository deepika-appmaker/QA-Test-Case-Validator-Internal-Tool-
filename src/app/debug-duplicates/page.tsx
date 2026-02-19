
'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

export default function DebugDuplicatesPage() {
    const { user } = useAuth();
    const [fileId, setFileId] = useState('');
    const [status, setStatus] = useState('');
    const [duplicates, setDuplicates] = useState<any[]>([]);

    const checkDuplicates = async () => {
        if (!fileId) return;
        setStatus('Checking...');
        try {
            const db = getFirebaseDb();
            const snapshot = await getDocs(collection(db, 'files', fileId, 'testCases'));

            const seen = new Set();
            const dups: any[] = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                if (seen.has(data.testId)) {
                    dups.push({ id: doc.id, ...data });
                } else {
                    seen.add(data.testId);
                }
            });

            setDuplicates(dups);
            setStatus(`Found ${dups.length} duplicates out of ${snapshot.size} total docs.`);
        } catch (err: any) {
            setStatus('Error: ' + err.message);
        }
    };

    const fixDuplicates = async () => {
        if (duplicates.length === 0) return;
        setStatus('Deleting duplicates...');
        try {
            const db = getFirebaseDb();
            let count = 0;
            for (const dup of duplicates) {
                await deleteDoc(doc(db, 'files', fileId, 'testCases', dup.id));
                count++;
            }
            setStatus(`Fixed! Deleted ${count} duplicates.`);
            setDuplicates([]);
        } catch (err: any) {
            setStatus('Error fixing: ' + err.message);
        }
    };

    if (!user) return <div className="p-10">Please login first</div>;

    return (
        <div className="p-10 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Debug Duplicates</h1>
            <div className="flex gap-4 mb-6">
                <input
                    type="text"
                    value={fileId}
                    onChange={e => setFileId(e.target.value)}
                    placeholder="File ID"
                    className="border p-2 rounded w-full"
                />
                <button onClick={checkDuplicates} className="bg-blue-600 text-white px-4 py-2 rounded">Check</button>
            </div>

            <p className="mb-4 font-mono">{status}</p>

            {duplicates.length > 0 && (
                <button onClick={fixDuplicates} className="bg-red-600 text-white px-4 py-2 rounded">
                    Fix Isues (Delete {duplicates.length} items)
                </button>
            )}

            <div className="mt-6">
                {duplicates.map(d => (
                    <div key={d.id} className="border-b py-2 text-sm">
                        Duplicate: {d.testId} (ID: {d.id})
                    </div>
                ))}
            </div>
        </div>
    );
}
