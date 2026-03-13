'use client';

import React, { useEffect, useState } from 'react';
import { api, Folder } from '@/lib/api';
import FileList from './FileList';

interface FolderListProps {
  workspaceId: string;
  refreshKey?: number;
  isOwner?: boolean;
}

export default function FolderList({ workspaceId, refreshKey = 0, isOwner = false }: FolderListProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openFolder, setOpenFolder] = useState<Folder | null>(null);

  const fetchFolders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.folders.list(workspaceId);
      setFolders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
    setOpenFolder(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, refreshKey]);

  const handleDelete = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder?')) return;
    setDeletingId(folderId);
    try {
      await api.folders.delete(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      if (openFolder?.id === folderId) setOpenFolder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-500">Loading folders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchFolders}
          className="mt-2 text-sm text-red-700 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Folder open view
  if (openFolder) {
    return (
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-4">
          <button
            onClick={() => setOpenFolder(null)}
            className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Folders
          </button>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="flex items-center gap-1.5 text-gray-900 font-medium">
            <span>📁</span>
            {openFolder.name}
          </span>
        </div>

        <FileList workspaceId={workspaceId} folderId={openFolder.id} isOwner={isOwner} />
      </div>
    );
  }

  // Folder list view
  if (folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-4">📁</div>
        <p className="text-gray-500 text-sm">No folders yet. Create your first folder.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {folders.map((folder) => (
            <tr
              key={folder.id}
              className="hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setOpenFolder(folder)}
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📁</span>
                  <span className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                    {folder.name}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {new Date(folder.createdAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleDelete(folder.id)}
                  disabled={deletingId === folder.id}
                  className="text-sm text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors font-medium"
                >
                  {deletingId === folder.id ? 'Deleting...' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
