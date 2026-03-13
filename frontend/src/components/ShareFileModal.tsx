'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import { api, User } from '@/lib/api';

interface ShareFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
}

type Permission = 'viewer' | 'editor';

const PERMISSION_OPTIONS: { value: Permission; label: string; desc: string }[] = [
  { value: 'viewer', label: 'Viewer', desc: 'Can view and download the file' },
  { value: 'editor', label: 'Editor', desc: 'Can view, download and update the file' },
];

export default function ShareFileModal({ isOpen, onClose, fileId, fileName }: ShareFileModalProps) {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<User | null | undefined>(undefined);
  const [permission, setPermission] = useState<Permission>('viewer');
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleClose = () => {
    setEmail('');
    setFoundUser(undefined);
    setPermission('viewer');
    setError('');
    setSuccess('');
    onClose();
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSearching(true);
    setError('');
    setFoundUser(undefined);
    setSuccess('');
    try {
      const user = await api.users.search(email.trim());
      setFoundUser(user);
      if (!user) setError('No user found with that email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleShare = async () => {
    if (!foundUser) return;
    setSharing(true);
    setError('');
    setSuccess('');
    try {
      await api.permissions.grant('file', fileId, foundUser.id, permission === 'editor' ? 'write' : 'read');
      setSuccess(`Shared with ${foundUser.name} as ${permission}.`);
      setFoundUser(undefined);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Share "${fileName}"`}>
      <div className="mt-2 space-y-4">
        {/* Email search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFoundUser(undefined); setError(''); setSuccess(''); }}
            placeholder="Enter email address"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!email.trim() || searching}
            className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {searching ? '...' : 'Find'}
          </button>
        </form>

        {/* Found user + permission */}
        {foundUser && (
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700">
                {foundUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{foundUser.name}</p>
                <p className="text-xs text-gray-500">{foundUser.email}</p>
              </div>
            </div>

            {/* Permission selector */}
            <div className="space-y-1.5">
              {PERMISSION_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${
                    permission === opt.value
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-transparent hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="permission"
                    value={opt.value}
                    checked={permission === opt.value}
                    onChange={() => setPermission(opt.value)}
                    className="accent-indigo-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <button
              onClick={handleShare}
              disabled={sharing}
              className="w-full py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {sharing && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {sharing ? 'Sharing...' : `Share with ${foundUser.name}`}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
      </div>
    </Modal>
  );
}
