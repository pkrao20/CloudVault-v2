'use client';

import React, { useEffect, useRef, useState } from 'react';
import { api, FileItem, FileVersion } from '@/lib/api';

interface TextFileViewerProps {
  file: FileItem;
  isOwner: boolean;
  canEdit?: boolean;
  onClose: () => void;
}

function formatSize(bytes: number | string): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TextFileViewer({ file, isOwner, canEdit = false, onClose }: TextFileViewerProps) {
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Track current version number separately so it updates after save/restore
  const [currentVersionNum, setCurrentVersionNum] = useState(file.currentVersionNumber);

  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [versionsError, setVersionsError] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const isDirty = content !== savedContent;

  // Warn before closing with unsaved changes
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const loadVersions = async () => {
    setVersionsLoading(true);
    setVersionsError('');
    try {
      const data = await api.files.getVersions(file.id);
      setVersions(data.slice(0, 5));
    } catch (err) {
      setVersionsError(err instanceof Error ? err.message : 'Failed to load versions.');
    } finally {
      setVersionsLoading(false);
    }
  };

  useEffect(() => {
    const loadContent = async () => {
      setContentLoading(true);
      setContentError('');
      try {
        const text = await api.files.getContent(file.id);
        setContent(text);
        setSavedContent(text);
      } catch (err) {
        setContentError(err instanceof Error ? err.message : 'Failed to load content.');
      } finally {
        setContentLoading(false);
      }
    };

    loadContent();
    loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const fileToUpload = new File([blob], file.name, { type: 'text/plain' });
      const updated = await api.files.update(file.id, fileToUpload);
      setSavedContent(content);
      setCurrentVersionNum(updated.currentVersionNumber);
      await loadVersions();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (isDirtyRef.current && !confirm('You have unsaved changes. Close anyway?')) return;
    onClose();
  };

  const handleRestore = async (version: FileVersion) => {
    if (!confirm(`Restore to version ${version.versionNumber}?`)) return;
    setRestoringId(version.id);
    setVersionsError('');
    try {
      const updated = await api.files.restoreVersion(file.id, version.id);
      const text = await api.files.getContent(file.id);
      setContent(text);
      setSavedContent(text);
      setCurrentVersionNum(updated.currentVersionNumber);
      await loadVersions();
    } catch (err) {
      setVersionsError(err instanceof Error ? err.message : 'Restore failed.');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-lg">📄</span>
          <span className="text-sm font-semibold text-gray-900">{file.name}</span>
          <span className="text-xs text-gray-400">v{currentVersionNum}</span>
          {isDirty && (
            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {saveError && (
            <span className="text-xs text-red-600">{saveError}</span>
          )}
          {(isOwner || canEdit) && isDirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {saving && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Text content area */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {contentLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-gray-500">Loading content...</span>
            </div>
          ) : contentError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{contentError}</p>
            </div>
          ) : (
            <textarea
              className="flex-1 w-full h-full resize-none border border-gray-200 rounded-lg p-4 text-sm font-mono text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
            />
          )}
        </div>

        {/* Versions sidebar */}
        <div className="w-64 border-l border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Version History
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {versionsLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : versionsError ? (
              <p className="text-xs text-red-500 px-1">{versionsError}</p>
            ) : versions.length === 0 ? (
              <p className="text-xs text-gray-400 px-1">No versions found.</p>
            ) : (
              versions.map((v) => {
                const isCurrent = v.versionNumber === currentVersionNum;
                return (
                  <div
                    key={v.id}
                    className={`rounded-lg border p-3 text-xs ${
                      isCurrent ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`font-semibold ${isCurrent ? 'text-indigo-700' : 'text-gray-700'}`}>
                        v{v.versionNumber}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full leading-none">
                          current
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 mb-0.5">{formatSize(v.size)}</p>
                    <p className="text-gray-400 mb-2">
                      {new Date(v.createdAt).toLocaleDateString()}{' '}
                      {new Date(v.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {!isCurrent && (isOwner || canEdit) && (
                      <button
                        onClick={() => handleRestore(v)}
                        disabled={restoringId === v.id}
                        className="w-full text-center text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 transition-colors"
                      >
                        {restoringId === v.id ? 'Restoring...' : 'Restore'}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
