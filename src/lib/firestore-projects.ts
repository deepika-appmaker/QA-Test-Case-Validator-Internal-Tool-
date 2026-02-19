import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    collection,
    Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import type { ProjectFolder } from '@/types';

const PROJECTS_COLLECTION = 'projects';
const DEFAULT_PROJECT_NAME = 'Legacy / Default';

// ─── Create ──────────────────────────────────────────────────────

export async function createProject(
    name: string,
    userId: string,
    description?: string
): Promise<ProjectFolder> {
    const db = getFirebaseDb();
    const projectRef = doc(collection(db, PROJECTS_COLLECTION));
    const project: ProjectFolder = {
        projectId: projectRef.id,
        name: name.trim(),
        description: description?.trim(),
        createdBy: userId,
        createdAt: Timestamp.now() as unknown as Date,
        updatedAt: Timestamp.now() as unknown as Date,
        avgScore: 0,
        deleted: false,
    };
    await setDoc(projectRef, project);
    return { ...project, createdAt: new Date(), updatedAt: new Date() };
}

// ─── Read ────────────────────────────────────────────────────────

export async function getProjects(): Promise<ProjectFolder[]> {
    const db = getFirebaseDb();
    const snapshot = await getDocs(collection(db, PROJECTS_COLLECTION));
    return snapshot.docs
        .map((d) => ({
            projectId: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate?.() || new Date(),
            updatedAt: d.data().updatedAt?.toDate?.() || d.data().createdAt?.toDate?.() || new Date(),
        }) as ProjectFolder)
        .filter((p) => !p.deleted)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getProject(projectId: string): Promise<ProjectFolder | null> {
    if (!projectId) return null;
    const db = getFirebaseDb();
    try {
        const docRef = doc(db, PROJECTS_COLLECTION, projectId);
        const snap = await getDoc(docRef);

        if (!snap.exists()) return null;

        const data = snap.data();
        return {
            projectId: snap.id,
            name: data.name || 'Untitled Project',
            description: data.description,
            createdBy: data.createdBy || '',
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
            avgScore: data.avgScore || 0,
            deleted: data.deleted || false,
        };
    } catch (error) {
        console.error('Error fetching project:', error);
        return null;
    }
}

/**
 * Get or create the default "Legacy / Default" project.
 */
export async function getOrCreateDefaultProject(userId: string): Promise<ProjectFolder> {
    const db = getFirebaseDb();
    const defaultRef = doc(db, PROJECTS_COLLECTION, 'default');
    const existing = await getDoc(defaultRef);

    if (existing.exists()) {
        const data = existing.data();
        return {
            projectId: 'default',
            name: data.name || DEFAULT_PROJECT_NAME,
            description: data.description,
            createdBy: data.createdBy || userId,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            deleted: false,
        };
    }

    // Create default project
    const project = {
        projectId: 'default',
        name: DEFAULT_PROJECT_NAME,
        description: 'Auto-created container for legacy files',
        createdBy: userId,
        createdAt: Timestamp.now() as unknown as Date,
        updatedAt: Timestamp.now() as unknown as Date,
        deleted: false,
    };
    await setDoc(defaultRef, project);
    return { ...project, createdAt: new Date() };
}

// ─── Update ──────────────────────────────────────────────────────

export async function updateProject(
    projectId: string,
    updates: { name?: string; description?: string }
): Promise<void> {
    const db = getFirebaseDb();
    const data: any = { updatedAt: Timestamp.now() };
    if (updates.name) data.name = updates.name.trim();
    if (updates.description !== undefined) data.description = updates.description.trim();

    await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), data);
}

// ─── Delete (soft) ───────────────────────────────────────────────

export async function deleteProject(projectId: string): Promise<void> {
    if (projectId === 'default') {
        throw new Error('Cannot delete the default project');
    }
    const db = getFirebaseDb();
    await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), {
        deleted: true,
        updatedAt: Timestamp.now(),
    });
}
