'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, Workspace } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout, isLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [wsLoading, setWsLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !token) {
      router.replace('/login');
    }
  }, [isLoading, token, router]);

  // Fetch workspaces for sidebar
  useEffect(() => {
    if (!token) return;
    const loadWorkspaces = async () => {
      setWsLoading(true);
      try {
        const data = await api.workspaces.list();
        setWorkspaces(data);
      } catch {
        // silently fail sidebar
      } finally {
        setWsLoading(false);
      }
    };
    loadWorkspaces();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) return null;

  const activeWorkspaceId = pathname.match(/\/dashboard\/workspace\/([^/]+)/)?.[1];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold text-indigo-600 cursor-pointer hover:text-indigo-700 transition-colors">
              CloudVault
            </h1>
          </Link>
        </div>

        {/* Workspaces nav */}
        <nav className="flex-1 overflow-y-auto p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
            Workspaces
          </p>
          {wsLoading ? (
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-400">Loading...</span>
            </div>
          ) : workspaces.length === 0 ? (
            <p className="text-xs text-gray-400 px-2">No workspaces yet.</p>
          ) : (
            <ul className="space-y-1">
              {workspaces.map((ws) => {
                const isActive = activeWorkspaceId === ws.id;
                return (
                  <li key={ws.id}>
                    <Link
                      href={`/dashboard/workspace/${ws.id}`}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors truncate ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="text-base flex-shrink-0">🗂️</span>
                      <span className="truncate">{ws.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-indigo-700">
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors py-2 px-3 rounded-lg text-left font-medium"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
    </div>
  );
}
