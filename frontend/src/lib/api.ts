const API_BASE = 'http://localhost:8080';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface Member {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface WorkspaceDetail extends Workspace {
  members: Member[];
}

export interface Folder {
  id: string;
  name: string;
  workspaceId: string;
  parentFolderId: string | null;
  createdAt: string;
}

export interface Permission {
  id: string;
  resourceType: 'file' | 'folder';
  resourceId: string;
  userId: string;
  permissionType: 'read' | 'write' | 'share';
  grantedBy: string;
  grantedAt: string;
}

export interface SharedItem {
  id: string; // permission id
  resourceId: string;
  permissionType: 'read' | 'write' | 'share';
  grantedAt: string;
  grantedBy: { id: string; name: string; email: string } | null;
}

export interface SharedItems {
  files: SharedItem[];
  folders: SharedItem[];
}

export interface SharedFileItem {
  shareId: string;
  sharedAt: string;
  permission: 'viewer' | 'editor';
  sharedBy: { id: string; name: string; email: string } | null;
  file: FileItem;
}

export interface FileVersion {
  id: string;
  fileId: string;
  versionNumber: number;
  storagePath: string;
  size: number;
  createdBy: string;
  createdAt: string;
  checksum: string | null;
}

export interface FileItem {
  id: string;
  name: string;
  folderId: string | null;
  workspaceId: string;
  ownerId: string;
  storagePath: string;
  size: number;
  mimeType: string | null;
  currentVersionId: string | null;
  currentVersionNumber: number;
  createdAt: string;
  updatedAt: string;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = true
): Promise<T> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  if (res.status === 204) return null as T;
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: User; accessToken: string }>(
        'POST',
        '/auth/login',
        { email, password },
        false
      ),
    register: (name: string, email: string, password: string) =>
      request<{ user: User; accessToken: string }>(
        'POST',
        '/auth/register',
        { name, email, password },
        false
      ),
  },
  users: {
    search: (email: string) =>
      request<User | null>('GET', `/users/search?email=${encodeURIComponent(email)}`),
  },
  workspaces: {
    list: () => request<Workspace[]>('GET', '/workspaces'),
    get: (id: string) => request<WorkspaceDetail>('GET', `/workspaces/${id}`),
    create: (name: string) => request<Workspace>('POST', '/workspaces', { name }),
    addMember: (workspaceId: string, userId: string, role: string) =>
      request<unknown>('POST', `/workspaces/${workspaceId}/members`, { userId, role }),
    removeMember: (workspaceId: string, userId: string) =>
      request<unknown>('DELETE', `/workspaces/${workspaceId}/members/${userId}`),
  },
  folders: {
    list: (workspaceId: string, parentFolderId?: string | null) => {
      const params = parentFolderId ? `?parentFolderId=${parentFolderId}` : '';
      return request<Folder[]>('GET', `/workspaces/${workspaceId}/folders${params}`);
    },
    create: (workspaceId: string, name: string, parentFolderId?: string | null) =>
      request<Folder>('POST', `/workspaces/${workspaceId}/folders`, {
        name,
        ...(parentFolderId ? { parentFolderId } : {}),
      }),
    delete: (folderId: string) => request<unknown>('DELETE', `/folders/${folderId}`),
  },
  files: {
    list: (workspaceId: string, folderId?: string | null) => {
      const params = folderId ? `?folderId=${folderId}` : '';
      return request<FileItem[]>('GET', `/workspaces/${workspaceId}/files${params}`);
    },
    getContent: async (fileId: string): Promise<string> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/files/${fileId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load file content');
      return res.text();
    },
    getVersions: (fileId: string) =>
      request<FileVersion[]>('GET', `/files/${fileId}/versions`),
    restoreVersion: (fileId: string, versionId: string) =>
      request<FileItem>('POST', `/files/${fileId}/versions/${versionId}/restore`),
    delete: (fileId: string) => request<unknown>('DELETE', `/files/${fileId}`),
    download: async (fileId: string, fileName: string): Promise<void> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/files/${fileId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    },
    getById: (fileId: string) => request<FileItem>('GET', `/files/${fileId}`),
    update: async (fileId: string, file: File): Promise<FileItem> => {
      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/files/${fileId}/update`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || 'Update failed');
      }
      return res.json();
    },
    upload: async (workspaceId: string, file: File, folderId?: string | null): Promise<FileItem> => {
      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);
      const params = folderId ? `?folderId=${folderId}` : '';
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/files${params}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || 'Upload failed');
      }
      return res.json();
    },
  },
  permissions: {
    grant: (
      resourceType: 'file' | 'folder',
      resourceId: string,
      userId: string,
      permissionType: 'read' | 'write' | 'share',
    ) =>
      request<Permission>('POST', '/permissions', {
        resourceType,
        resourceId,
        userId,
        permissionType,
      }),
    revoke: (permissionId: string) =>
      request<unknown>('DELETE', `/permissions/${permissionId}`),
    getMyShared: () => request<SharedItems>('GET', '/me/shared'),
  },
};
