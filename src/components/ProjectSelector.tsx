'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { getProjects, createProject, getOrCreateDefaultProject } from '@/lib/firestore-projects';
import type { ProjectFolder } from '@/types';

interface ProjectSelectorProps {
    selectedProjectId: string | null;
    onSelect: (projectId: string, projectName: string) => void;
    embedded?: boolean;
}

export default function ProjectSelector({ selectedProjectId, onSelect, embedded = false }: ProjectSelectorProps) {
    const { user, isAdmin } = useAuth();
    const [projects, setProjects] = useState<ProjectFolder[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Ensure default project exists
            await getOrCreateDefaultProject(user.uid);
            const all = await getProjects();
            setProjects(all);

            // Auto-select default if nothing selected
            if (!selectedProjectId && all.length > 0) {
                const def = all.find((p) => p.projectId === 'default');
                if (def) onSelect(def.projectId, def.name);
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!user || !newName.trim()) return;
        setCreating(true);
        try {
            const project = await createProject(newName.trim(), user.uid, newDescription.trim());
            setProjects((prev) => [project, ...prev]);
            onSelect(project.projectId, project.name);
            setNewName('');
            setNewDescription('');
            setShowCreate(false);
        } catch (error) {
            console.error('Failed to create project:', error);
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className={`rounded-xl border border-stone-200 bg-white p-4 mb-6 ${embedded ? 'border-none bg-transparent p-0 mb-0' : ''}`}>
                <div className="flex items-center gap-2 text-stone-400 text-sm">
                    <span className="w-4 h-4 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
                    Loading projects...
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-3 ${embedded ? '' : 'rounded-xl border border-stone-200 bg-white p-5 mb-6'}`}>
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                    </svg>
                    Project Folder
                </label>

                {isAdmin && (
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        New Project
                    </button>
                )}
            </div>

            {/* Project dropdown */}
            <select
                value={selectedProjectId || ''}
                onChange={(e) => {
                    const p = projects.find((proj) => proj.projectId === e.target.value);
                    if (p) onSelect(p.projectId, p.name);
                }}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
            >
                <option value="" disabled>Select a project folder...</option>
                {projects.map((p) => (
                    <option key={p.projectId} value={p.projectId}>
                        {p.name}
                    </option>
                ))}
            </select>

            {/* Inline create */}
            {showCreate && (
                <div className="space-y-3 pt-2 border-t border-stone-100 mt-2">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Project Name..."
                        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                        autoFocus
                    />
                    <textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Optional Description..."
                        rows={2}
                        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none"
                    />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCreate}
                            disabled={creating || !newName.trim()}
                            className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {creating ? 'Creating...' : 'Create Project'}
                        </button>
                        <button
                            onClick={() => { setShowCreate(false); setNewName(''); setNewDescription(''); }}
                            className="px-4 py-2 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
