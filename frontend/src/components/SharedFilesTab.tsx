'use client';

import React, { useEffect, useState } from 'react';
import { api, SharedFileItem, FileItem, SharedItem } from '@/lib/api';
import TextFileViewer from './TextFileViewer';

interface SharedFilesTabProps {
  currentWorkspaceId?: string;
}

function formatSize(bytes: number | string): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isTextFile(file: FileItem): boolean {
  return file.mimeType === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
}

function fileIcon(mimeType: string | null): string {
  if (!mimeType) return '📎';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️';
  return '📎';
}

export default function SharedFilesTab({ currentWorkspaceId }: SharedFilesTabProps = {}) {
  const [sharedFiles, setSharedFiles] = useState<SharedFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openTextFile, setOpenTextFile] = useState<FileItem | null>(null);

  // Share-forward modal state
  const [shareTarget, setShareTarget] = useState<FileItem | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareSuccess, setShareSuccess] = useState('');

  const fetchShared = async () => {
    setLoading(true);
    setError('');
    try {
      const { files: perms } = await api.permissions.getMyShared();
      const fileItems = await Promise.all(
        perms.map((p: SharedItem) => api.files.getById(p.resourceId).catch(() => null)),
      );
      const result: SharedFileItem[] = perms
        .map((p: SharedItem, i: number) => {
          const file = fileItems[i];
          if (!file) return null;
          return {
            shareId: p.id,
            sharedAt: p.grantedAt,
            permission: (p.permissionType === 'write' ? 'editor' : 'viewer') as 'viewer' | 'editor',
            sharedBy: p.grantedBy,
            file,
          };
        })
        .filter(Boolean) as SharedFileItem[];
      setSharedFiles(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shared files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShared();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (s: SharedFileItem) => {
    if (!confirm(`Delete "${s.file.name}"? This cannot be undone.`)) return;
    setDeletingId(s.file.id);
    try {
      await api.files.delete(s.file.id);
      setSharedFiles((prev) => prev.filter((f) => f.shareId !== s.shareId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (file: FileItem) => {
    setDownloadingId(file.id);
    try {
      await api.files.download(file.id, file.name);
    } catch {
      setError('Download failed.');
    } finally {
      setDownloadingId(null);
    }
  };

  const openShareModal = (file: FileItem) => {
    setShareTarget(file);
    setShareEmail('');
    setShareError('');
    setShareSuccess('');
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareTarget || !shareEmail.trim()) return;
    setShareLoading(true);
    setShareError('');
    setShareSuccess('');
    try {
      const found = await api.users.search(shareEmail.trim());
      if (!found) {
        setShareError('No user found with that email.');
        return;
      }
      await api.permissions.grant('file', shareTarget.id, found.id, 'read');
      setShareSuccess(`Shared with ${found.name}`);
      setShareEmail('');
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Failed to share.');
    } finally {
      setShareLoading(false);
    }
  };

  // When no workspace context, show all files grouped by workspace
  const inWorkspace = currentWorkspaceId
    ? sharedFiles.filter((s) => s.file.workspaceId === currentWorkspaceId)
    : [];
  const external = currentWorkspaceId
    ? sharedFiles.filter((s) => s.file.workspaceId !== currentWorkspaceId)
    : sharedFiles;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-500">Loading shared files...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={fetchShared} className="mt-2 text-sm text-red-700 underline">
          Try again
        </button>
      </div>
    );
  }

  if (sharedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <p className="text-gray-500 text-sm">No files have been shared with you yet.</p>
      </div>
    );
  }

  const tableHead = (
    <thead className="bg-gray-50">
      <tr>
        <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
        <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
        <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shared by</th>
        <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access</th>
        <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
        <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
      </tr>
    </thead>
  );

  const renderRows = (items: SharedFileItem[]) =>
    items.map((s) => (
      <tr key={s.shareId} className="hover:bg-gray-50 transition-colors">
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{fileIcon(s.file.mimeType)}</span>
            {isTextFile(s.file) ? (
              <button
                onClick={() => setOpenTextFile(s.file)}
                className="text-sm text-indigo-600 hover:underline font-medium text-left"
              >
                {s.file.name}
              </button>
            ) : (
              <span className="text-sm text-gray-900">{s.file.name}</span>
            )}
          </div>
        </td>
        <td className="px-5 py-3 text-sm text-gray-500">{formatSize(s.file.size)}</td>
        <td className="px-5 py-3 text-sm text-gray-500">{s.sharedBy?.name ?? '—'}</td>
        <td className="px-5 py-3">
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
            s.permission === 'editor'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {s.permission === 'editor' ? 'Editor' : 'Viewer'}
          </span>
        </td>
        <td className="px-5 py-3 text-sm text-gray-500">
          {new Date(s.sharedAt).toLocaleDateString()}
        </td>
        <td className="px-5 py-3 text-right">
          <div className="flex items-center justify-end gap-3">
            {isTextFile(s.file) && (
              <button
                onClick={() => setOpenTextFile(s.file)}
                className="text-sm text-gray-600 hover:text-indigo-600 transition-colors font-medium"
              >
                Open
              </button>
            )}
            <button
              onClick={() => handleDownload(s.file)}
              disabled={downloadingId === s.file.id}
              className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors font-medium"
            >
              {downloadingId === s.file.id ? 'Downloading...' : 'Download'}
            </button>
            <button
              onClick={() => openShareModal(s.file)}
              className="text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium"
            >
              Share
            </button>
            {s.permission === 'editor' && (
              <button
                onClick={() => handleDelete(s)}
                disabled={deletingId === s.file.id}
                className="text-sm text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors font-medium"
              >
                {deletingId === s.file.id ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </td>
      </tr>
    ));

  const renderSection = (items: SharedFileItem[], label: string) =>
    items.length === 0 ? null : (
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{label}</h3>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            {tableHead}
            <tbody className="divide-y divide-gray-100">{renderRows(items)}</tbody>
          </table>
        </div>
      </div>
    );

  return (
    <div className="space-y-8">
      {renderSection(inWorkspace, 'From this workspace')}
      {renderSection(external, currentWorkspaceId ? 'From other workspaces' : 'All shared files')}

      {openTextFile && (
        <TextFileViewer
          file={openTextFile}
          isOwner={false}
          canEdit={true}
          onClose={() => setOpenTextFile(null)}
        />
      )}

      {/* Share-forward modal */}
      {shareTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Share &ldquo;{shareTarget.name}&rdquo;
              </h2>
              <button
                onClick={() => setShareTarget(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleShare} className="flex gap-2">
              <input
                type="email"
                placeholder="User email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button
                type="submit"
                disabled={shareLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {shareLoading ? 'Sharing...' : 'Share'}
              </button>
            </form>
            {shareError && <p className="mt-2 text-sm text-red-600">{shareError}</p>}
            {shareSuccess && <p className="mt-2 text-sm text-green-600">{shareSuccess}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
