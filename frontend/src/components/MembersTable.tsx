'use client';

import React, { useState } from 'react';
import { api, Member } from '@/lib/api';

interface MembersTableProps {
  members: Member[];
  workspaceOwnerId: string;
  currentUserId: string;
  workspaceId: string;
  onRemoved: () => void;
}

const roleBadge: Record<string, string> = {
  owner: 'bg-indigo-100 text-indigo-700',
  editor: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-600',
};

export default function MembersTable({
  members,
  workspaceOwnerId,
  currentUserId,
  workspaceId,
  onRemoved,
}: MembersTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const isCurrentUserOwner = currentUserId === workspaceOwnerId;

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this member from the workspace?')) return;
    setRemovingId(userId);
    setError('');
    try {
      await api.workspaces.removeMember(workspaceId, userId);
      onRemoved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member.');
    } finally {
      setRemovingId(null);
    }
  };

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-4">👥</div>
        <p className="text-gray-500 text-sm">No members yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member) => {
              const isOwnerRow = member.userId === workspaceOwnerId;
              const canRemove = isCurrentUserOwner && !isOwnerRow;

              return (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-indigo-700">
                          {member.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{member.user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{member.user.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        roleBadge[member.role] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canRemove && (
                      <button
                        onClick={() => handleRemove(member.userId)}
                        disabled={removingId === member.userId}
                        className="text-sm text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors font-medium"
                      >
                        {removingId === member.userId ? 'Removing...' : 'Remove'}
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
  );
}
