# CodeSync

CodeSync is a collaborative code editing prototype built as a small monorepo.

It combines:
- a `Next.js` client for auth, projects, file browsing, and the editor UI
- a `Yjs` websocket server for realtime collaboration
- a shared package intended for common types

## Features

- Email/password signup and login with `next-auth`
- Project creation
- File and folder creation inside a project
- Project sharing with `editor` and `viewer` roles
- Realtime collaborative editing with `Yjs`, `y-websocket`, and Monaco
- Database-backed file persistence

## Repo Structure

```text
package.json  Root workspace scripts
package/
  client/   Next.js app, Prisma schema, API routes, editor UI
  server/   Yjs websocket server
  shared/   Shared types/package scaffold
```

## Tech Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `NextAuth`
- `Prisma`
- `MongoDB`
- `Monaco Editor`
- `Yjs`
- `y-websocket`

## Requirements

- `Node.js` 20+
- a MongoDB database

## Environment Variables

Create a `.env` file in `package/client`:

```env
DATABASE_URL="mongodb://localhost:27017/codesync"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_WS_URL="ws://localhost:8080"
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

You can also create a `.env` file in `package/server` to configure the websocket server port:

```env
PORT=8080
NEXTAUTH_SECRET="replace-with-the-same-secret-used-by-the-client"
```

## Install

Install dependencies from the repo root:

```bash
npm install
```

## Prisma Setup

From `package/client`:

```bash
npx prisma generate
```

If you are starting from a fresh database, apply the Prisma workflow you want for MongoDB before using the app.

## Run Locally

Start the full workspace from the repo root:

```bash
npm run dev
```

Useful root scripts:

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
- Realtime websocket server: `ws://localhost:8080`

## How It Works

### Auth

The client uses credential-based authentication through `next-auth`.

### Projects and Access

- Project owners can create files and manage collaborator roles
- Editors can read and write project files
- Viewers can open the project in read-only mode

### Realtime Editing

Each file is edited in a Yjs room keyed by the file id. Monaco is bound to the shared Yjs document with `y-monaco`.

### Persistence

Editor content is also saved through the app API so file contents remain available after refresh or reconnect.

### Rate Limiting

API routes use a store-backed rate limiter. For local development it falls back to in-memory limits. For distributed deployments, configure Upstash Redis in `package/client/.env`.

## Scripts

### `package/client`

- `npm run dev` - start Next.js in development
- `npm run build` - build the client
- `npm run start` - run the production build
- `npm run lint` - run ESLint

### `package/server`

- `npm run dev` - start the websocket server with `ts-node`

## Current Limitations

- The root landing page is still the default Next.js starter page
- The UI is functional but still prototype-level
- There are no automated tests yet
- The `shared` package is only lightly used right now

## Suggested Next Improvements

- Add a real landing page and onboarding flow
- Add stronger persistence/versioning behavior for collaborative edits
- Add test coverage for auth, permissions, and file APIs
- Add deployment docs for the client and websocket server
