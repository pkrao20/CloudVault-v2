'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Workspace } from '@/lib/api';
import CreateWorkspaceModal from '@/components/CreateWorkspaceModal';
import SharedFilesTab from '@/components/SharedFilesTab';

type Tab = 'workspaces' | 'shared';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('workspaces');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchWorkspaces = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.workspaces.list();
      setWorkspaces(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreated = (workspace: Workspace) => {
    setWorkspaces((prev) => [workspace, ...prev]);
  };

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage workspaces and view files shared with you</p>
        </div>
        {activeTab === 'workspaces' && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Workspace
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6" aria-label="Tabs">
          {([
            { value: 'workspaces', label: 'Workspaces' },
            { value: 'shared', label: 'Shared with Me' },
          ] as { value: Tab; label: string }[]).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.value
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Workspaces tab */}
      {activeTab === 'workspaces' && (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
              <button onClick={fetchWorkspaces} className="mt-1 text-sm text-red-700 underline hover:no-underline">
                Try again
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 py-12 justify-center">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Loading workspaces...</span>
            </div>
          )}

          {!loading && !error && workspaces.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-6xl mb-5">🗂️</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">No workspaces yet</h2>
              <p className="text-sm text-gray-500 mb-6">
                Create your first workspace to start organizing files.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors"
              >
                Create Workspace
              </button>
            </div>
          )}

          {!loading && workspaces.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/workspace/${ws.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">🗂️</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{ws.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Created {new Date(ws.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/workspace/${ws.id}`);
                      }}
                      className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-lg py-2 transition-colors"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Shared with Me tab */}
      {activeTab === 'shared' && <SharedFilesTab />}

      <CreateWorkspaceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
