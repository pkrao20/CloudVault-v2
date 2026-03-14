'use client';

import React, { useEffect, useState } from 'react';
import { api, FileItem } from '@/lib/api';
import UploadFileModal from './UploadFileModal';
import TextFileViewer from './TextFileViewer';
import ShareFileModal from './ShareFileModal';

interface FileListProps {
  workspaceId: string;
  folderId: string;
  isOwner: boolean;
  canEdit?: boolean;
}

function formatSize(bytes: number | string): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isTextFile(file: FileItem): boolean {
  return (
    file.mimeType === 'text/plain' ||
    file.name.toLowerCase().endsWith('.txt')
  );
}

function fileIcon(mimeType: string | null): string {
  if (!mimeType) return '📎';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️';
  return '📎';
}

export default function FileList({ workspaceId, folderId, isOwner, canEdit = false }: FileListProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [openTextFile, setOpenTextFile] = useState<FileItem | null>(null);
  const [sharingFile, setSharingFile] = useState<FileItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.files.list(workspaceId, folderId);
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  const handleDownload = async (file: FileItem) => {
    setDownloadingId(file.id);
    try {
      await api.files.download(file.id, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    setDeletingId(fileId);
    try {
      await api.files.delete(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-500">Loading files...</span>
      </div>
    );
  }

  return (
    <div>
      {isOwner && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload File
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-gray-400 text-sm">This folder is empty.</p>
          {isOwner && (
            <p className="text-gray-400 text-xs mt-1">Upload a file to get started.</p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{fileIcon(file.mimeType)}</span>
                      {isTextFile(file) ? (
                        <button
                          onClick={() => setOpenTextFile(file)}
                          className="text-sm text-indigo-600 hover:underline font-medium text-left"
                        >
                          {file.name}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-900">{file.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{formatSize(file.size)}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {isTextFile(file) && (
                        <button
                          onClick={() => setOpenTextFile(file)}
                          className="text-sm text-gray-600 hover:text-indigo-600 transition-colors font-medium"
                        >
                          Open
                        </button>
                      )}
                      {isOwner && (
                        <button
                          onClick={() => setSharingFile(file)}
                          className="text-sm text-gray-600 hover:text-indigo-600 transition-colors font-medium"
                        >
                          Share
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(file)}
                        disabled={downloadingId === file.id}
                        className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors font-medium"
                      >
                        {downloadingId === file.id ? 'Downloading...' : 'Download'}
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => handleDelete(file.id)}
                          disabled={deletingId === file.id}
                          className="text-sm text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors font-medium"
                        >
                          {deletingId === file.id ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UploadFileModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        workspaceId={workspaceId}
        folderId={folderId}
        onUploaded={() => {
          setShowUploadModal(false);
          fetchFiles();
        }}
      />

      {openTextFile && (
        <TextFileViewer
          file={openTextFile}
          isOwner={isOwner}
          canEdit={canEdit}
          onClose={() => setOpenTextFile(null)}
        />
      )}

      {sharingFile && (
        <ShareFileModal
          isOpen={true}
          onClose={() => setSharingFile(null)}
          fileId={sharingFile.id}
          fileName={sharingFile.name}
        />
      )}
    </div>
  );
}
