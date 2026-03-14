# CloudVault

A self-hosted file storage and collaboration platform. Teams can organize files into workspaces and folders, share with fine-grained permissions, and track full version history per file.

## Architecture

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Backend | NestJS 10, TypeScript, Passport JWT |
| Database | PostgreSQL 14+ with TypeORM |
| Storage | Local disk (configurable path) |

```
int/
├── frontend/    # Next.js app (port 3001)
└── backend/     # NestJS API (port 8080)
```

---

## Prerequisites

- **Node.js** 18+
- **npm** 9+
- **PostgreSQL** 14+

---

## Quick Start

### 1. Clone & install dependencies

```bash
git clone <repo-url>
cd int

# Install both frontend and backend dependencies
cd backend && npm install
cd ../frontend && npm install
```

### 2. Set up the database

```bash
# Create a PostgreSQL database
psql -U postgres -c "CREATE DATABASE cloudvault;"
```

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=cloudvault

# JWT — change this in production!
JWT_SECRET=cloudvault-secret-change-in-prod
JWT_EXPIRES_IN=7d

# App
PORT=8080
NODE_ENV=development

# File storage path (created automatically on first run)
STORAGE_PATH=./storage
```

### 4. Start the backend

```bash
cd backend
npm run start:dev
```

TypeORM will auto-create all database tables on first run (`synchronize: true`). The API will be available at `http://localhost:8080`.

### 5. Start the frontend

Open a new terminal:

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:3001`.

### 6. Create your first account

Navigate to `http://localhost:3001`, click **Sign up**, and register. Then log in and create a workspace.

---

## Development

### Backend

```bash
cd backend
npm run start:dev    # watch mode (recommended)
npm run start:debug  # watch mode + Node.js debugger
npm run build        # compile TypeScript → dist/
npm start            # run compiled output (production)
```

### Frontend

```bash
cd frontend
npm run dev    # development server on port 3001
npm run build  # production build
npm start      # serve production build on port 3001
```

---

## Features

- **Workspaces** — shared spaces with owner/editor/viewer roles
- **Folders** — unlimited depth, move/rename support
- **Files** — upload `.txt` files (see [Current Limitations](#current-limitations)), rename, move between folders
- **Version history** — up to 10 versions per file with one-click restore
- **Sharing** — grant read/write/share permissions to individual users on files or folders; sharing a folder automatically cascades the same permission to all descendant subfolders and their files
- **Workspace member permissions** — adding a member auto-grants them permissions on every existing file and folder in the workspace (role maps to: `owner`→share, `editor`→write, `viewer`→read)
- **Shared with me** — view all files and folders others have shared with you

---

## API Overview

All endpoints except `/auth/*` require `Authorization: Bearer <token>`.

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login` |
| Users | `GET /users/search?email=` |
| Workspaces | `POST /workspaces`, `GET /workspaces`, `GET /workspaces/:id`, `DELETE /workspaces/:id` |
| Members | `POST /workspaces/:id/members`, `DELETE /workspaces/:id/members/:userId` |
| Folders | `POST /workspaces/:wid/folders`, `GET /workspaces/:wid/folders`, `PATCH /folders/:id/rename`, `PATCH /folders/:id/move`, `DELETE /folders/:id` |
| Files | `POST /workspaces/:wid/files` (upload), `GET /files/:id/download`, `PATCH /files/:id/rename`, `PATCH /files/:id/move`, `DELETE /files/:id` |
| Versions | `GET /files/:id/versions`, `POST /files/:id/versions/:vid/restore` |
| Permissions | `POST /permissions`, `DELETE /permissions/:id`, `GET /me/shared` |

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_DATABASE` | `cloudvault` | Database name |
| `JWT_SECRET` | *(required)* | Secret key for signing JWTs — use a long random string in production |
| `JWT_EXPIRES_IN` | `7d` | Token expiry duration |
| `PORT` | `8080` | Port the API listens on |
| `NODE_ENV` | `development` | `development` or `production` |
| `STORAGE_PATH` | `./storage` | Directory for uploaded files |
| `FRONTEND_URL` | `http://localhost:3001` | Allowed CORS origin |

### Frontend

The API base URL is hardcoded to `http://localhost:8080` in [frontend/src/lib/api.ts](frontend/src/lib/api.ts). Update `API_BASE` there to point to a different backend host.

---

## Database Schema

7 tables managed by TypeORM (auto-synced on startup):

```
users               — accounts (email + bcrypt password)
workspaces          — shared workspaces (soft-deleted)
workspace_members   — role-based membership (owner | editor | viewer)
folders             — hierarchical folders (self-referential parentFolderId, soft-deleted)
files               — file metadata + current version pointer (soft-deleted)
file_versions       — version history, max 10 per file
permissions         — per-resource sharing (read | write | share)
```

---

## Production Notes

- Set `NODE_ENV=production` and use a strong, random `JWT_SECRET`.
- Set `FRONTEND_URL` to your actual frontend domain for CORS.
- TypeORM `synchronize: true` is convenient for development but can be destructive on schema changes in production — consider switching to migrations.
- Mount `STORAGE_PATH` on persistent, backed-up storage (the directory holds all uploaded file data).
- Run the backend behind a reverse proxy (nginx/Caddy) to handle TLS.

---

## Current Limitations

- **File uploads are restricted to `.txt` files only.** This is intentional while the versioning system is being tested. The upload modal enforces this on the frontend (file picker filter + drop validation). The backend accepts any file type, so the restriction can be lifted by removing the `accept=".txt"` attribute and the extension check in [UploadFileModal.tsx](frontend/src/components/UploadFileModal.tsx).

---

## Troubleshooting

**`Cannot connect to database`**
Verify PostgreSQL is running and the credentials in `.env` match. Ensure the `cloudvault` database exists.

**`CORS error` in browser**
Confirm `FRONTEND_URL` in `backend/.env` matches the origin the frontend is served from (including port).

**`Unauthorized` on all API calls**
The JWT token may have expired. Log out and log back in; the new token is stored in localStorage.

**Files not saving**
Check that `STORAGE_PATH` is writable by the Node process. The backend creates `storage/` and `storage/tmp/` automatically, but the parent directory must exist.
