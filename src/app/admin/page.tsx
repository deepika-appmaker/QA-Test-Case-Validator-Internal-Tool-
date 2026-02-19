'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import ProtectedAdminRoute from '@/components/ProtectedAdminRoute';
import { getAllFiles, getTestCasesByFile, getAllUsers, updateUserRole } from '@/lib/firestore';
import { getProjects } from '@/lib/firestore-projects';
import type { ProjectFolder, FileRecord, TestCase, UserProfile, UserRole } from '@/types';

export default function AdminPage() {
    return (
        <ProtectedAdminRoute>
            <AdminContent />
        </ProtectedAdminRoute>
    );
}

function AdminContent() {
    const { user, signOut, isAdmin } = useAuth();
    const router = useRouter();

    const [files, setFiles] = useState<FileRecord[]>([]);
    const [projects, setProjects] = useState<ProjectFolder[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [roleUpdating, setRoleUpdating] = useState<string | null>(null);

    // Filters
    const [filterProject, setFilterProject] = useState<string>('all');
    const [filterUser, setFilterUser] = useState<string>('all');
    const [filterScoreMin, setFilterScoreMin] = useState<number>(0);
    const [filterScoreMax, setFilterScoreMax] = useState<number>(100);

    // Low-quality drill-down
    const [lowQualityFiles, setLowQualityFiles] = useState<{ file: FileRecord; cases: TestCase[] }[]>([]);
    const [loadingLowQ, setLoadingLowQ] = useState(false);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fileList, projectList, userList] = await Promise.all([
                getAllFiles(),
                getProjects(),
                getAllUsers(),
            ]);
            setFiles(fileList);
            setProjects(projectList);
            setUsers(userList);
        } catch (error) {
            console.error('Failed to load admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (uid: string, newRole: UserRole) => {
        setRoleUpdating(uid);
        try {
            await updateUserRole(uid, newRole);
            setUsers((prev) => prev.map((u) => u.userId === uid ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error('Failed to update role:', error);
        } finally {
            setRoleUpdating(null);
        }
    };

    // Filtered files
    const filteredFiles = useMemo(() => {
        return files.filter((f) => {
            if (filterProject !== 'all' && (f.projectId || 'default') !== filterProject) return false;
            if (filterUser !== 'all' && f.uploadedBy !== filterUser) return false;
            if (f.averageScore != null) {
                if (f.averageScore < filterScoreMin || f.averageScore > filterScoreMax) return false;
            }
            return true;
        });
    }, [files, filterProject, filterUser, filterScoreMin, filterScoreMax]);

    // Unique users
    const uniqueUsers = useMemo(() => {
        const users = new Set(files.map((f) => f.uploadedBy).filter(Boolean));
        return Array.from(users) as string[];
    }, [files]);

    // Stats
    const stats = useMemo(() => {
        const total = filteredFiles.length;
        const reviewed = filteredFiles.filter((f) => f.aiReviewed).length;
        const totalRows = filteredFiles.reduce((sum, f) => sum + (f.rowCount || 0), 0);
        const scoredFiles = filteredFiles.filter((f) => f.averageScore != null);
        const avgScore = scoredFiles.length > 0
            ? Math.round(scoredFiles.reduce((sum, f) => sum + (f.averageScore || 0), 0) / scoredFiles.length)
            : null;
        const lowQuality = filteredFiles.filter((f) => f.averageScore != null && (f.averageScore || 0) < 50).length;

        return { total, reviewed, totalRows, avgScore, lowQuality };
    }, [filteredFiles]);

    // Load low-quality test cases
    const handleViewLowQuality = async () => {
        setLoadingLowQ(true);
        const lowFiles = filteredFiles.filter((f) => f.aiReviewed && f.averageScore != null && (f.averageScore || 0) < 50);
        const results: { file: FileRecord; cases: TestCase[] }[] = [];

        for (const f of lowFiles.slice(0, 5)) { // Limit to 5 files
            try {
                const cases = await getTestCasesByFile(f.fileId);
                const lowCases = cases.filter((tc) => tc.score != null && (tc.score || 0) < 50);
                if (lowCases.length > 0) {
                    results.push({ file: f, cases: lowCases });
                }
            } catch { /* skip */ }
        }

        setLowQualityFiles(results);
        setLoadingLowQ(false);
    };

    return (
        <div className="min-h-screen bg-stone-50">
            {/* Header */}
            <header className="border-b border-stone-200 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
                            </svg>
                        </div>
                        <h1 className="text-lg font-semibold text-stone-800">Admin Dashboard</h1>
                    </div>

                    <nav className="flex items-center gap-1">
                        <button onClick={() => router.push('/')} className="px-3 py-1.5 rounded-lg text-sm text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-all">Dashboard</button>
                        <button className="px-3 py-1.5 rounded-lg text-sm font-medium text-violet-700 bg-violet-50">Admin</button>
                    </nav>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2">
                            {user?.photoURL && <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full ring-2 ring-violet-100" />}
                            <span className="text-sm text-stone-500">{user?.email}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">Admin</span>
                        </div>
                        <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Sign out</button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-10">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                            <p className="text-stone-400 text-sm">Loading dashboard...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Filters */}
                        <div className="rounded-xl border border-stone-200 bg-white p-4 mb-6">
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-stone-500 font-medium">Project:</label>
                                    <select
                                        value={filterProject}
                                        onChange={(e) => setFilterProject(e.target.value)}
                                        className="text-xs rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-stone-600 focus:outline-none focus:ring-2 focus:ring-violet-200"
                                    >
                                        <option value="all">All Projects</option>
                                        {projects.map((p) => (
                                            <option key={p.projectId} value={p.projectId}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-stone-500 font-medium">User:</label>
                                    <select
                                        value={filterUser}
                                        onChange={(e) => setFilterUser(e.target.value)}
                                        className="text-xs rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-stone-600 focus:outline-none focus:ring-2 focus:ring-violet-200"
                                    >
                                        <option value="all">All Users</option>
                                        {uniqueUsers.map((u) => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-stone-500 font-medium">Score:</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={filterScoreMin}
                                        onChange={(e) => setFilterScoreMin(Number(e.target.value))}
                                        className="w-14 text-xs rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-stone-600 text-center focus:outline-none focus:ring-2 focus:ring-violet-200"
                                    />
                                    <span className="text-xs text-stone-400">to</span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={filterScoreMax}
                                        onChange={(e) => setFilterScoreMax(Number(e.target.value))}
                                        className="w-14 text-xs rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-stone-600 text-center focus:outline-none focus:ring-2 focus:ring-violet-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
                            <DashCard label="Total Uploads" value={stats.total} icon="📁" color="indigo" />
                            <DashCard label="Reviewed" value={stats.reviewed} icon="✅" color="emerald" />
                            <DashCard label="Total Test Cases" value={stats.totalRows} icon="📋" color="blue" />
                            <DashCard label="Avg Score" value={stats.avgScore !== null ? `${stats.avgScore}%` : '—'} icon="📊" color="violet" />
                            <DashCard label="Low Quality" value={stats.lowQuality} icon="⚠️" color="red" />
                        </div>

                        {/* User Management */}
                        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden mb-8">
                            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">👥</span>
                                    <h3 className="text-sm font-semibold text-stone-700">User Management</h3>
                                </div>
                                <span className="text-xs text-stone-400">{users.length} users</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-stone-50 border-b border-stone-200">
                                            <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">User</th>
                                            <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Email</th>
                                            <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Joined</th>
                                            <th className="text-center px-4 py-2.5 font-medium text-stone-500 text-xs">Projects</th>
                                            <th className="text-center px-4 py-2.5 font-medium text-stone-500 text-xs">Uploads</th>
                                            <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Current Role</th>
                                            <th className="text-right px-4 py-2.5 font-medium text-stone-500 text-xs">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {users.map((u) => {
                                            const userProjects = projects.filter(p => p.createdBy === u.userId).length;
                                            const userUploads = files.filter(f => f.uploadedBy === u.email).length;

                                            return (
                                                <tr key={u.userId} className="hover:bg-stone-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2.5">
                                                            {u.photoURL ? (
                                                                <img src={u.photoURL} alt="" className="w-7 h-7 rounded-full ring-1 ring-stone-200" />
                                                            ) : (
                                                                <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-xs font-bold">
                                                                    {(u.displayName || u.email || '?').charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <span className="text-xs font-medium text-stone-700 truncate max-w-[150px]">
                                                                {u.displayName || 'No Name'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-stone-500 truncate max-w-[200px]">{u.email}</td>
                                                    <td className="px-4 py-3 text-xs text-stone-500 tabular-nums">
                                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-stone-600 font-medium text-center tabular-nums">
                                                        {userProjects}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-stone-600 font-medium text-center tabular-nums">
                                                        {userUploads}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.role === 'admin'
                                                            ? 'bg-violet-100 text-violet-700'
                                                            : 'bg-stone-100 text-stone-600'
                                                            }`}>
                                                            {u.role === 'admin' ? 'Admin' : 'QA User'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {u.userId === user?.uid ? (
                                                            <span className="text-xs text-stone-400 italic">You</span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleRoleChange(u.userId, u.role === 'admin' ? 'qa' : 'admin')}
                                                                disabled={roleUpdating === u.userId}
                                                                className={`text-xs font-medium px-3 py-1 rounded-lg border transition-all disabled:opacity-50 ${u.role === 'admin'
                                                                    ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                                                                    : 'text-violet-600 border-violet-200 hover:bg-violet-50'
                                                                    }`}
                                                            >
                                                                {roleUpdating === u.userId ? 'Updating...' : u.role === 'admin' ? 'Demote to QA' : 'Promote to Admin'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Uploads Table */}
                        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden mb-8">
                            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-stone-700">Recent Uploads</h3>
                                <span className="text-xs text-stone-400">{filteredFiles.length} files</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-stone-50 border-b border-stone-200">
                                            <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">File</th>
                                            <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Project</th>
                                            <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Uploaded By</th>
                                            <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Version</th>
                                            <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Rows</th>
                                            <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Score</th>
                                            <th className="text-left px-4 py-2.5 font-medium text-stone-500 text-xs">Date</th>
                                            <th className="text-right px-4 py-2.5 font-medium text-stone-500 text-xs">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {filteredFiles.slice(0, 25).map((file) => {
                                            const project = projects.find((p) => p.projectId === (file.projectId || 'default'));
                                            return (
                                                <tr key={file.fileId} className="hover:bg-stone-50 transition-colors">
                                                    <td className="px-4 py-2.5 font-medium text-stone-700 text-xs">{file.fileName}</td>
                                                    <td className="px-4 py-2.5 text-stone-500 text-xs">{project?.name || 'Legacy / Default'}</td>
                                                    <td className="px-4 py-2.5 text-stone-500 text-xs truncate max-w-[140px]">{file.uploadedBy || '—'}</td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="text-xs px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-mono">v{file.version || 1}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-stone-600 text-xs tabular-nums">{file.rowCount}</td>
                                                    <td className="px-4 py-2.5">
                                                        {file.averageScore != null ? (
                                                            <span className={`text-xs font-semibold tabular-nums ${(file.averageScore || 0) >= 70 ? 'text-emerald-600' :
                                                                (file.averageScore || 0) >= 50 ? 'text-amber-600' : 'text-red-600'
                                                                }`}>{Math.round(file.averageScore)}%</span>
                                                        ) : <span className="text-stone-400 text-xs">—</span>}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-stone-500 text-xs tabular-nums">
                                                        {file.uploadDate ? new Date(file.uploadDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <button
                                                            onClick={() => router.push(`/results?fileId=${file.fileId}`)}
                                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50 transition-all"
                                                        >View</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Low Quality Section */}
                        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-stone-700">Low-Quality Test Cases (Score &lt; 50)</h3>
                                <button
                                    onClick={handleViewLowQuality}
                                    disabled={loadingLowQ}
                                    className="text-xs font-medium text-violet-600 hover:text-violet-700 px-3 py-1 rounded-lg border border-violet-200 hover:bg-violet-50 transition-all disabled:opacity-50"
                                >
                                    {loadingLowQ ? 'Loading...' : 'Load Details'}
                                </button>
                            </div>

                            {lowQualityFiles.length > 0 && (
                                <div className="divide-y divide-stone-100">
                                    {lowQualityFiles.map(({ file, cases }) => (
                                        <div key={file.fileId} className="px-5 py-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-xs font-medium text-stone-700">{file.fileName}</span>
                                                <span className="text-xs text-stone-400">•</span>
                                                <span className="text-xs text-stone-500">{file.uploadedBy}</span>
                                                <span className="text-xs text-stone-400">•</span>
                                                <span className="text-xs text-red-600 font-medium">{cases.length} low-quality cases</span>
                                            </div>
                                            <div className="space-y-2">
                                                {cases.slice(0, 5).map((tc) => (
                                                    <div key={tc.testId} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-red-50/50 border border-red-100">
                                                        <span className="font-mono text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded flex-shrink-0">{tc.testId}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-stone-700 truncate">{tc.description}</p>
                                                            <p className="text-xs text-stone-500 mt-0.5">{tc.comment || 'No comment'}</p>
                                                        </div>
                                                        <span className="text-xs font-semibold text-red-600 tabular-nums flex-shrink-0">{tc.score}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

// ─── Dashboard Stat Card ─────────────────────────────────────────

function DashCard({
    label,
    value,
    icon,
    color,
}: {
    label: string;
    value: string | number;
    icon: string;
    color: 'indigo' | 'emerald' | 'blue' | 'violet' | 'red';
}) {
    const colorMap = {
        indigo: 'border-indigo-200 bg-indigo-50',
        emerald: 'border-emerald-200 bg-emerald-50',
        blue: 'border-blue-200 bg-blue-50',
        violet: 'border-violet-200 bg-violet-50',
        red: 'border-red-200 bg-red-50',
    };
    const textMap = {
        indigo: 'text-indigo-700',
        emerald: 'text-emerald-700',
        blue: 'text-blue-700',
        violet: 'text-violet-700',
        red: 'text-red-700',
    };

    return (
        <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{icon}</span>
                <p className="text-xs text-stone-500 uppercase tracking-wider">{label}</p>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${textMap[color]}`}>{value}</p>
        </div>
    );
}
