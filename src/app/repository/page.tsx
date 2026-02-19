'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getProjects } from '@/lib/firestore-projects';
import { getFilesByProject, getAllFiles, getFilesByUser } from '@/lib/firestore';
import type { ProjectFolder, FileRecord } from '@/types';

export default function RepositoryPage() {
    return (
        <ProtectedRoute>
            <RepositoryContent />
        </ProtectedRoute>
    );
}

function RepositoryContent() {
    const { user, signOut, isAdmin } = useAuth();
    const router = useRouter();
    const [projects, setProjects] = useState<ProjectFolder[]>([]);
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const projectList = await getProjects();
            setProjects(projectList);

            // Load files based on role
            const fileList = isAdmin ? await getAllFiles() : await getFilesByUser(user.uid);
            setFiles(fileList);
        } catch (error) {
            console.error('Failed to load repository:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredFiles = selectedProject === 'all'
        ? files
        : files.filter((f) => (f.projectId || 'default') === selectedProject);

    const handleViewResults = (fileId: string) => {
        router.push(`/results?fileId=${fileId}`);
    };

    return (
        <div className="min-h-screen bg-stone-50">
            {/* Header */}
            <header className="border-b border-stone-200 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                            </svg>
                        </div>
                        <h1 className="text-lg font-semibold text-stone-800">QA Validator</h1>
                    </div>

                    {/* Nav Links */}
                    <nav className="flex items-center gap-1">
                        <button onClick={() => router.push('/')} className="px-3 py-1.5 rounded-md text-sm font-medium text-stone-600 hover:text-indigo-600 hover:bg-stone-100 transition-all">
                            Dashboard
                        </button>
                        <button onClick={() => router.push('/upload')} className="px-3 py-1.5 rounded-md text-sm font-medium text-stone-600 hover:text-indigo-600 hover:bg-stone-100 transition-all">
                            Upload
                        </button>
                        <button className="px-3 py-1.5 rounded-md text-sm font-medium bg-stone-100 text-indigo-700 shadow-sm">
                            Repository
                        </button>
                        {isAdmin && (
                            <button onClick={() => router.push('/admin')} className="px-3 py-1.5 rounded-lg text-sm text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-all">
                                Admin
                            </button>
                        )}
                    </nav>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2">
                            {user?.photoURL && (
                                <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full ring-2 ring-indigo-100" />
                            )}
                            <span className="text-sm text-stone-500">{user?.email}</span>
                            {isAdmin && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">Admin</span>
                            )}
                        </div>
                        <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Sign out</button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-stone-800">File Repository</h2>
                        <p className="text-sm text-stone-500 mt-1">Browse uploaded test case files by project</p>
                    </div>
                    <button
                        onClick={() => router.push('/upload')}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Upload New
                    </button>
                </div>

                {/* Project Filter */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setSelectedProject('all')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedProject === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-stone-600 border border-stone-200 hover:border-indigo-300'
                                }`}
                        >
                            All Projects
                        </button>
                        {projects.map((p) => (
                            <button
                                key={p.projectId}
                                onClick={() => setSelectedProject(p.projectId)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedProject === p.projectId
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white text-stone-600 border border-stone-200 hover:border-indigo-300'
                                    }`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* File Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            <p className="text-stone-400 text-sm">Loading repository...</p>
                        </div>
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div className="rounded-xl border border-stone-200 bg-white p-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                            </svg>
                        </div>
                        <p className="text-stone-400 text-sm">No files found in this project</p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-stone-50 border-b border-stone-200">
                                        <th className="text-left px-4 py-3 font-medium text-stone-500">File Name</th>
                                        <th className="text-left px-4 py-3 font-medium text-stone-500">Version</th>
                                        <th className="text-left px-4 py-3 font-medium text-stone-500">Project</th>
                                        {isAdmin && <th className="text-left px-4 py-3 font-medium text-stone-500">Uploaded By</th>}
                                        <th className="text-left px-4 py-3 font-medium text-stone-500">Rows</th>
                                        <th className="text-left px-4 py-3 font-medium text-stone-500">Score</th>
                                        <th className="text-left px-4 py-3 font-medium text-stone-500">Date</th>
                                        <th className="text-left px-4 py-3 font-medium text-stone-500">Status</th>
                                        <th className="text-right px-4 py-3 font-medium text-stone-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {filteredFiles.map((file) => {
                                        const project = projects.find((p) => p.projectId === (file.projectId || 'default'));
                                        return (
                                            <tr key={file.fileId} className="hover:bg-stone-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                                        </svg>
                                                        <span className="font-medium text-stone-700">{file.fileName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-mono">
                                                        v{file.version || 1}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-stone-500">
                                                    {project?.name || 'Legacy / Default'}
                                                </td>
                                                {isAdmin && (
                                                    <td className="px-4 py-3 text-stone-500 truncate max-w-[150px]">
                                                        {file.uploadedBy || '—'}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-stone-600 tabular-nums">{file.rowCount}</td>
                                                <td className="px-4 py-3">
                                                    {file.aiReviewed && file.averageScore != null ? (
                                                        <span className={`text-sm font-semibold tabular-nums ${file.averageScore >= 70 ? 'text-emerald-600' :
                                                            file.averageScore >= 50 ? 'text-amber-600' : 'text-red-600'
                                                            }`}>
                                                            {Math.round(file.averageScore)}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-stone-400 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-stone-500 tabular-nums text-xs">
                                                    {file.uploadDate ? new Date(file.uploadDate).toLocaleDateString('en-IN', {
                                                        day: 'numeric', month: 'short', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit',
                                                    }) : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {file.aiReviewed ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            Reviewed
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => handleViewResults(file.fileId)}
                                                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-md hover:bg-indigo-50 transition-all"
                                                    >
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
