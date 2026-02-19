'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getProject } from '@/lib/firestore-projects';
import { getFilesByProject, deleteFile, updateFile, getAllUsers } from '@/lib/firestore'; // Import getAllUsers
import type { ProjectFolder, FileRecord, UserProfile } from '@/types';

// ... imports
import { updateProject, deleteProject } from '@/lib/firestore-projects';

interface PageProps {
    params: Promise<{
        projectId: string;
    }>;
}

export default function ProjectDetailsPage({ params }: PageProps) {
    // Unwrap params using React.use()
    const { projectId } = use(params);

    return (
        <ProtectedRoute>
            <ProjectDetailsContent projectId={projectId} />
        </ProtectedRoute>
    );
}

function ProjectDetailsContent({ projectId }: { projectId: string }) {

    const { user } = useAuth();
    const router = useRouter();
    const [project, setProject] = useState<ProjectFolder | null>(null);
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [userMap, setUserMap] = useState<Record<string, string>>({}); // New state for user mapping
    const [loading, setLoading] = useState(true);

    // Edit State (Project)
    const [showEdit, setShowEdit] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');

    // Edit State (File Rename)
    const [editingFile, setEditingFile] = useState<string | null>(null);
    const [newFileName, setNewFileName] = useState('');

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [proj, projFiles, allUsers] = await Promise.all([
                getProject(projectId),
                getFilesByProject(projectId),
                getAllUsers()
            ]);
            setProject(proj);
            setFiles(projFiles);

            // Create user map (email -> displayName)
            const map: Record<string, string> = {};
            allUsers.forEach(u => {
                if (u.email) map[u.email] = u.displayName || u.email;
            });
            setUserMap(map);

        } catch (error) {
            console.error('Failed to load project data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!project || !editName.trim()) return;
        try {
            await updateProject(projectId, {
                name: editName.trim(),
                description: editDescription.trim()
            });
            setProject(prev => prev ? ({ ...prev, name: editName.trim(), description: editDescription.trim() }) : null);
            setShowEdit(false);
        } catch (error) {
            console.error('Failed to update project:', error);
            alert('Failed to update project. Please try again.');
        }
    };

    const handleUpdateFile = async (fileId: string) => {
        if (!newFileName.trim()) return;
        try {
            // Ensure .csv extension for consistency if desired, or allow free text
            let finalName = newFileName.trim();
            if (!finalName.toLowerCase().endsWith('.csv')) {
                finalName += '.csv';
            }

            await updateFile(fileId, { fileName: finalName });

            setFiles(prev => prev.map(f => f.fileId === fileId ? { ...f, fileName: finalName } : f));
            setEditingFile(null);
        } catch (error) {
            console.error('Failed to rename file:', error);
            alert('Failed to rename file.');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
        try {
            await deleteProject(projectId);
            router.push('/');
        } catch (error) {
            console.error('Failed to delete project:', error);
            alert('Failed to delete project. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-stone-400 text-sm">Loading project...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-stone-800 mb-2">Project Not Found</h1>
                    <button
                        onClick={() => router.push('/')}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-stone-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="mb-4">
                        <button
                            onClick={() => router.push('/')}
                            className="group inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-indigo-600 transition-colors"
                        >
                            <span className="p-1.5 rounded-lg bg-white border border-stone-200 group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-all shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                                </svg>
                            </span>
                            Back to Dashboard
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                                </svg>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold text-stone-900">{project.name}</h1>
                                    <button
                                        onClick={() => {
                                            setEditName(project.name);
                                            setEditDescription(project.description || '');
                                            setShowEdit(true);
                                        }}
                                        className="p-1 rounded-md text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                        title="Edit Project"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-sm text-stone-500">
                                    {files.length} file{files.length !== 1 ? 's' : ''} • Created {new Date(project.createdAt).toLocaleDateString()}
                                </p>
                                {project.description && (
                                    <p className="text-sm text-stone-500 mt-1 max-w-xl">{project.description}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Delete Button (Admin Only) - Using inline check for now since useRole hook is available via AuthProvider but logic simplifies here */}
                            {/* Ideally should check role from user object */}
                            {user?.email && (process.env.NEXT_PUBLIC_ADMIN_EMAILS?.includes(user.email) || user.email === 'admin@example.com') && (
                                <button
                                    onClick={handleDelete}
                                    className="p-2.5 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                    title="Delete Project"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                </button>
                            )}

                            <button
                                onClick={() => router.push(`/upload?projectId=${projectId}`)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                </svg>
                                Upload New File
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-semibold text-stone-800 mb-4">Edit Project</h3>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Project Name..."
                            className="w-full rounded-xl border border-stone-200 px-4 py-3 text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all mb-3"
                            autoFocus
                        />
                        <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Optional Description..."
                            rows={3}
                            className="w-full rounded-xl border border-stone-200 px-4 py-3 text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none mb-4"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowEdit(false)}
                                className="px-4 py-2 rounded-lg text-stone-500 hover:text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={!editName.trim()}
                                className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {files.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 border-dashed">
                        <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-stone-800">No files yet</h3>
                        <p className="text-stone-500 max-w-sm mx-auto mt-2 mb-6">
                            This project is empty. Upload your first CSV file to get started with validation.
                        </p>
                        <button
                            onClick={() => router.push(`/upload?projectId=${projectId}`)}
                            className="px-4 py-2 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-medium transition-colors"
                        >
                            Upload File
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-stone-50 border-b border-stone-200 text-xs text-stone-500 uppercase tracking-wider">
                                    <th className="px-6 py-3 font-semibold">File Name</th>
                                    <th className="px-6 py-3 font-semibold">Uploaded By</th>
                                    <th className="px-6 py-3 font-semibold">Rows</th>
                                    <th className="px-6 py-3 font-semibold">Uploaded</th>
                                    <th className="px-6 py-3 font-semibold">Status</th>
                                    <th className="px-6 py-3 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {files.map((file) => (
                                    <tr key={file.fileId} className="hover:bg-stone-50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-stone-800">
                                            {/* ... (file name cell content remains same, just simplifying for replace match if needed, but here I'll try to keep context) ... */}
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                                    </svg>
                                                </div>

                                                {editingFile === file.fileId ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={newFileName}
                                                            onChange={(e) => setNewFileName(e.target.value)}
                                                            className="border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleUpdateFile(file.fileId);
                                                                if (e.key === 'Escape') setEditingFile(null);
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => handleUpdateFile(file.fileId)}
                                                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingFile(null)}
                                                            className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 group/edit">
                                                        <span>{file.fileName}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingFile(file.fileId);
                                                                setNewFileName(file.fileName);
                                                            }}
                                                            className="p-1 text-stone-300 hover:text-indigo-600 opacity-0 group-hover/edit:opacity-100 transition-all"
                                                            title="Rename File"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-stone-600 text-sm">
                                            {file.uploadedBy
                                                ? (userMap[file.uploadedBy] || file.uploadedBy.split('@')[0])
                                                : '—'
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-stone-500">{file.rowCount}</td>
                                        <td className="px-6 py-4 text-stone-500 text-sm">
                                            {new Date(file.uploadDate).toLocaleDateString()}
                                            <span className="text-stone-400 text-xs ml-1">
                                                {new Date(file.uploadDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {file.aiReviewed ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    Reviewed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Admin Delete File */}
                                                {user?.email && (process.env.NEXT_PUBLIC_ADMIN_EMAILS?.includes(user.email) || user.email === 'admin@example.com') && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (!confirm(`Are you sure you want to delete "${file.fileName}"? This cannot be undone.`)) return;
                                                            try {
                                                                await deleteFile(file.fileId);
                                                                setFiles(prev => prev.filter(f => f.fileId !== file.fileId));
                                                            } catch (err) {
                                                                console.error('Failed to delete file:', err);
                                                                alert('Failed to delete file.');
                                                            }
                                                        }}
                                                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Delete File"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                        </svg>
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => {
                                                        // Store meta for analysis
                                                        sessionStorage.setItem('qa-validator-meta', JSON.stringify({
                                                            projectId: file.projectId,
                                                            projectName: project.name,
                                                            fileName: file.fileName,
                                                            fileId: file.fileId
                                                        }));
                                                        // Navigate to results with fileId param to load history
                                                        router.push(`/results?fileId=${file.fileId}`);
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    View Details
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}
