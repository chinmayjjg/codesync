# CodeSync

CodeSync is a collaborative coding workspace built as a TypeScript monorepo. It combines authenticated projects, realtime editing, role-based access control, recoverable file history, and a dedicated websocket collaboration server in one product-focused system.

The goal is not just to prove that collaborative editing works. The goal is to show a cleaner, more interview-ready, demo-ready implementation of the full stack around it: auth, persistence, roles, project structure, API boundaries, and operational thinking.

## What It Does

- Create an account and sign in with email and password
- Create coding projects from a dashboard
- Create files and folders inside each project
- Share projects with `editor` and `viewer` roles
- Edit files collaboratively in realtime with Yjs and Monaco
- Save file history and restore earlier snapshots
- Protect APIs with auth, access checks, and rate limiting

## Positioning

CodeSync sits in the space between a prototype editor demo and a more complete collaborative product slice.

It is useful as:

- A full-stack portfolio project
- A system design talking point for collaborative software
- A foundation for experimenting with realtime presence and file workflows
- A reference for combining Next.js, Prisma, auth, and Yjs in one repo

## Architecture

```text
codesync/
  package/client   Next.js 16 app, auth, API routes, Prisma, dashboard, editor UI
  package/server   Dedicated websocket server for Yjs collaboration
  package/shared   Shared types for roles, files, presence, and version data
```

### Request Flow

1. A user signs up or logs in through the Next.js client using credentials auth.
2. The client creates or loads projects and files through route handlers in the app.
3. Authorization is enforced at the project and file layers using role-aware access helpers.
4. When a file is opened, the client receives a websocket token and connects to the Yjs server.
5. Monaco is bound to the shared Yjs document, enabling realtime sync and awareness state.
6. File content is also persisted through the app APIs so data survives refreshes and reconnects.

### Runtime Pieces

- `Next.js 16` and `React 19` power the UI and route handlers
- `Prisma` connects the app to `MongoDB`
- `NextAuth` handles credential sessions with JWT-backed auth state
- `Yjs`, `y-websocket`, and `y-monaco` provide realtime collaboration
- `Upstash Redis` is optional for distributed rate limiting, with in-memory fallback locally

## Why These Design Decisions

### Yjs

Yjs is used because collaborative editing is the core product differentiator. It gives efficient CRDT-based sync, awareness state for presence, and a mature ecosystem around editors like Monaco.

### Dedicated Websocket Server

The websocket server is split into its own package so collaboration concerns stay separate from the main web app. That keeps the Next.js app focused on product APIs and lets the realtime server scale independently later.

### JWT For Websocket Auth

The websocket layer uses JWT verification so only authenticated users can join collaboration rooms. This reuses the same auth boundary as the main app and avoids anonymous socket access to project rooms.

### Redis-Backed Rate Limiting

Rate limiting falls back to memory locally but supports Upstash Redis for distributed environments. That gives a simple developer experience now while leaving room for multi-instance deployments later.

### MongoDB With Prisma

MongoDB fits the current project shape well: user records, projects, hierarchical files, memberships, and snapshot history. Prisma keeps the data access layer typed and consistent with the rest of the TypeScript stack.

## Current Feature Set

### Authentication

- Credential-based signup and login
- Password hashing with bcrypt
- JWT-backed session strategy
- Auth-protected dashboard and project pages

### Projects And Access

- Project creation from the dashboard
- Role-aware access model:
  - `owner`: full control
  - `editor`: read and write
  - `viewer`: read only
- Collaborator invite and role update flow

### Realtime Editing

- One collaboration room per file
- Live shared editing with Monaco
- Presence and awareness state for active collaborators
- Websocket authentication and heartbeat handling

### Persistence And Recovery

- Files persist through the app API
- Snapshot-style version history is stored
- Restore flow allows earlier content recovery

## Testing Status

The repo now has meaningful automated coverage in a few important areas:

- Auth logic tests
- Project/file API route tests
- Access control tests
- File operation tests
- Websocket server tests for:
  - missing token rejection
  - invalid token rejection
  - multi-client room sync
  - disconnect and reconnect behavior

An initial Playwright E2E scaffold has also been added for browser-flow coverage, though browser execution still depends on completing local Playwright browser setup.

## Demo

- Demo link: not yet published
- Recommended future addition: deployed client URL plus websocket endpoint notes

## Screenshots

Screenshots are not committed yet.

Recommended additions:

- Landing page
- Dashboard with project creation
- Project editor with collaborators and presence
- Version history restore flow

## Scaling Considerations

CodeSync is already structured in a way that supports a stronger production story, but there are some natural next steps if it were pushed further.

### What Already Helps

- Web app and websocket server are split into separate packages
- Role checks are centralized rather than scattered through the UI
- Rate limiting supports a hosted distributed store
- Shared types reduce drift across boundaries

### Likely Next Scaling Steps

- Persist Yjs updates more explicitly for stronger collaborative recovery guarantees
- Introduce room-level authorization checks tied more directly to project membership
- Add deployment docs and environment separation for dev, test, and prod
- Add E2E coverage around auth, project creation, and multi-session collaboration
- Expand the shared package to cover API DTOs and cross-package contracts more completely
- Add observability for websocket rooms, reconnects, and failure paths

## Local Development

### Requirements

- Node.js 20+
- MongoDB

### Environment Variables

Create `package/client/.env`:

```env
DATABASE_URL="mongodb://localhost:27017/codesync"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_WS_URL="ws://localhost:8080"
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

Create `package/server/.env`:

```env
PORT=8080
NEXTAUTH_SECRET="replace-with-the-same-secret-used-by-the-client"
```

### Install

```bash
npm install
```

### Prisma

From `package/client`:

```bash
npx prisma generate
```

### Run

From the repo root:

```bash
npm run dev
```

Useful scripts:

```bash
npm run dev:client
npm run dev:server
npm run build
npm run lint
npm run test
npm run test:coverage
npm run typecheck
```

Default local URLs:

- App: `http://localhost:3000`
- Realtime server: `ws://localhost:8080`

## Repo Notes

- The client README generated by `create-next-app` is still present in `package/client/README.md` and can be replaced with package-specific docs later.
- The shared package is useful today, but still has room to grow into a stronger source of truth for API contracts.
