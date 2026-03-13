'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import { api, User } from '@/lib/api';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onAdded: () => void;
}

export default function AddMemberModal({
  isOpen,
  onClose,
  workspaceId,
  onAdded,
}: AddMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'found' | 'not-found'>('idle');
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setEmail('');
    setRole('viewer');
    setFoundUser(null);
    setSearchStatus('idle');
    setSearching(false);
    setAdding(false);
    setError('');
    onClose();
  };

  const handleSearch = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSearching(true);
    setSearchStatus('idle');
    setFoundUser(null);
    setError('');
    try {
      const user = await api.users.search(trimmed);
      if (user) {
        setFoundUser(user);
        setSearchStatus('found');
      } else {
        setSearchStatus('not-found');
      }
    } catch {
      setSearchStatus('not-found');
    } finally {
      setSearching(false);
    }
  };

  const handleBlur = () => {
    if (email.trim()) handleSearch();
  };

  const handleAdd = async () => {
    if (!foundUser) return;
    setAdding(true);
    setError('');
    try {
      await api.workspaces.addMember(workspaceId, foundUser.id, role);
      onAdded();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Member">
      <div className="space-y-4">
        <div>
          <label htmlFor="member-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <div className="flex gap-2">
            <input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSearchStatus('idle');
                setFoundUser(null);
              }}
              onBlur={handleBlur}
              placeholder="colleague@example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching || !email.trim()}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {searchStatus === 'found' && foundUser && (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{foundUser.name}</p>
              <p className="text-xs text-gray-500">{foundUser.email}</p>
            </div>
          </div>
        )}

        {searchStatus === 'not-found' && (
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-sm text-red-700">No user found with this email.</p>
          </div>
        )}

        <div>
          <label htmlFor="member-role" className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            id="member-role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="viewer">Viewer — can view folders</option>
            <option value="editor">Editor — can create and delete folders</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!foundUser || adding}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {adding ? 'Adding...' : 'Add to Workspace'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
