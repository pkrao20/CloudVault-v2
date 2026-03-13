'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, WorkspaceDetail } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import FolderList from '@/components/FolderList';
import MembersTable from '@/components/MembersTable';
import CreateFolderModal from '@/components/CreateFolderModal';
import AddMemberModal from '@/components/AddMemberModal';
import SharedFilesTab from '@/components/SharedFilesTab';
type Tab = 'folders' | 'members' | 'shared';

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('folders');
  const [folderRefreshKey, setFolderRefreshKey] = useState(0);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);

  const fetchWorkspace = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.workspaces.get(id);
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const currentUserMember = workspace?.members.find((m) => m.userId === user?.id);
  const isOwner = workspace?.ownerId === user?.id;
  const isEditor = currentUserMember?.role === 'editor';
  const canAddMembers = isOwner || isEditor;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-500">Loading workspace...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={fetchWorkspace} className="mt-2 text-sm text-red-700 underline hover:no-underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/dashboard" className="hover:text-gray-700 transition-colors">
          Workspaces
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">{workspace.name}</span>
      </nav>

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Created {new Date(workspace.createdAt).toLocaleDateString()} &middot;{' '}
          {workspace.members.length} member{workspace.members.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6" aria-label="Tabs">
          {(['folders', 'members', 'shared'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'shared' ? 'Shared with Me' : tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'folders' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowFolderModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Folder
            </button>
          </div>
          <FolderList workspaceId={id} refreshKey={folderRefreshKey} isOwner={isOwner} />
        </div>
      )}

      {activeTab === 'members' && (
        <div>
          <div className="flex justify-end mb-4">
            {canAddMembers && (
              <button
                onClick={() => setShowMemberModal(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Member
              </button>
            )}
          </div>
          <MembersTable
            members={workspace.members}
            workspaceOwnerId={workspace.ownerId}
            currentUserId={user?.id ?? ''}
            workspaceId={id}
            onRemoved={fetchWorkspace}
          />
        </div>
      )}

      {activeTab === 'shared' && (
        <SharedFilesTab currentWorkspaceId={id} />
      )}

      {/* Modals */}
      <CreateFolderModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        workspaceId={id}
        onCreated={() => {
          setFolderRefreshKey((k) => k + 1);
        }}
      />

      <AddMemberModal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        workspaceId={id}
        onAdded={fetchWorkspace}
      />
    </div>
  );
}
