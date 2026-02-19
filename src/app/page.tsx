'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getProjects, createProject, getOrCreateDefaultProject } from '@/lib/firestore-projects';
import { getAllFiles } from '@/lib/firestore';
import type { ProjectFolder } from '@/types';

export default function Dashboard() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectFolder[]>([]);
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Dashboard Filters & View
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        loadProjects();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router]);

  const loadProjects = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await getOrCreateDefaultProject(user.uid);
      const [allProjects, allFiles] = await Promise.all([
        getProjects(),
        getAllFiles()
      ]);
      setProjects(allProjects);

      // Calculate counts
      const counts: Record<string, number> = {};
      allFiles.forEach(f => {
        const pid = f.projectId || 'default';
        counts[pid] = (counts[pid] || 0) + 1;
      });
      setFileCounts(counts);

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
      setNewName('');
      setNewDescription('');
      setShowCreate(false);
      // Optional: Auto-navigate to the new project
      router.push(`/project/${project.projectId}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-stone-400 text-sm font-medium animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-stone-800 tracking-tight">Active Projects</h1>
            </div>

            <div className="flex items-center gap-4">
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-violet-700 bg-violet-50 hover:bg-violet-100 text-sm font-medium transition-all border border-violet-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                  </svg>
                  Admin Dashboard
                </button>
              )}
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Project
              </button>
              <div className="w-px h-6 bg-stone-200" />
              <div className="flex items-center gap-3">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full ring-2 ring-indigo-50" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                    {(user?.email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="relative w-full sm:w-96">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="flex items-center bg-stone-50 rounded-lg p-1 border border-stone-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-stone-400 hover:text-stone-600'}`}
                  title="Grid View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-stone-400 hover:text-stone-600'}`}
                  title="List View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
                  </svg>
                </button>
              </div>
              <div className="w-px h-6 bg-stone-200 mx-2" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
                className="bg-stone-50 border border-stone-200 text-stone-700 text-sm rounded-lg focus:ring-indigo-500/20 focus:border-indigo-500 block p-2"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Create Modal Overlay */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-semibold text-stone-800 mb-4">Create New Project</h3>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project Name..."
                className="w-full rounded-xl border border-stone-200 px-4 py-3 text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all mb-3"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional Description..."
                rows={3}
                className="w-full rounded-xl border border-stone-200 px-4 py-3 text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none mb-4"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowCreate(false); setNewName(''); setNewDescription(''); }}
                  className="px-4 py-2 rounded-lg text-stone-500 hover:text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Projects Grid / List */}
        <div className={viewMode === 'grid'
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          : "flex flex-col gap-3"
        }>
          {filteredProjects.map((project) => {
            // Determine accent color based on score
            const score = project.avgScore || 0;
            const accentColor = score >= 90 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-indigo-500';
            const accentText = score >= 90 ? 'text-emerald-700 bg-emerald-50' : score >= 70 ? 'text-amber-700 bg-amber-50' : 'text-indigo-700 bg-indigo-50';
            const count = fileCounts[project.projectId] || 0;

            return (
              <button
                key={project.projectId}
                onClick={() => router.push(`/project/${project.projectId}`)}
                className={`group relative text-left bg-white rounded-2xl transition-all duration-300 overflow-hidden ${viewMode === 'grid'
                  ? "flex flex-col h-[280px] shadow-sm hover:shadow-xl hover:-translate-y-1"
                  : "flex flex-row items-center p-4 border border-stone-200 hover:border-indigo-300 hover:shadow-md"
                  }`}
              >
                {/* Grid View Content */}
                {viewMode === 'grid' && (
                  <>
                    <div className={`absolute top-0 left-0 w-full h-1.5 ${accentColor}`} />
                    <div className="p-6 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${accentText}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                          </svg>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {score > 0 && (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${accentText}`}>
                              {score}% Avg
                            </span>
                          )}
                          <span className="text-xs text-stone-400 font-medium">
                            {count} file{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-stone-800 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {project.name}
                      </h3>

                      <p className="text-sm text-stone-500 line-clamp-2 mb-6 flex-grow">
                        {project.description || "No description provided."}
                      </p>

                      <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400 font-medium">
                        <span>Updated {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-1 text-indigo-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          Open Project
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* List View Content */}
                {viewMode === 'list' && (
                  <div className="flex items-center gap-4 w-full">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accentText}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-4">
                        <h3 className="text-base font-semibold text-stone-800 group-hover:text-indigo-600 transition-colors truncate">
                          {project.name}
                        </h3>
                      </div>
                      <div className="col-span-4 text-sm text-stone-500 truncate">
                        {project.description || <span className="text-stone-300 italic">No description</span>}
                      </div>
                      <div className="col-span-2 text-sm text-stone-500 text-right">
                        {count} file{count !== 1 ? 's' : ''}
                      </div>
                      <div className="col-span-2 text-xs text-stone-400 text-right">
                        {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}
              </button>
            );
          })}

          {/* Create New Card */}
          {(viewMode === 'grid' || filteredProjects.length === 0) && (
            <button
              onClick={() => setShowCreate(true)}
              className="group flex flex-col items-center justify-center text-center bg-stone-50/50 rounded-2xl border-2 border-dashed border-stone-200/80 p-6 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-300 min-h-[280px]"
            >
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300 group-hover:shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-indigo-400 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-stone-600 group-hover:text-indigo-700 transition-colors">Create New Project</h3>
              <p className="text-sm text-stone-400 mt-2 max-w-[200px]">Start a new validation suite for your test cases</p>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
