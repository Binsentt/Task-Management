# Task Management System

A MERN task-management application with authenticated personal tasks,
organization collaboration, remote shifts, presence tracking, and realtime
WebSocket updates. The React frontend is in `Task/`; the Express/MongoDB API is
in `server/`.

## Requirements

- Node.js 20.19+ (or 22.12+)
- npm 10+

## Install

From the repository root:

```bash
npm install
```

## Frontend

Start the Vite development server:

```bash
npm run dev
```

Create the production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run the landing-page tests:

```bash
npm test
```

The Vite frontend in `Task/` uses React, Tailwind CSS v4 through `@tailwindcss/vite`, and
lucide-react. It can be built and run independently of the backend.

## Backend

Create the local server environment file from the safe example:

```bash
cp server/.env.example server/.env
```

Start the Express server in watch mode:

```bash
npm run dev:server
```

Required backend variables are `MONGODB_URI` and a `JWT_SECRET` with at least
32 characters. `CLIENT_URL` and the optional comma-separated `CORS_ORIGINS`
configure the exact frontend origins allowed to use credentialed CORS. Set them
to the frontend's actual origin(s), including the port. The server exposes REST
routes under `/api` and an authenticated WebSocket endpoint at `/ws`.

Start the backend:

```bash
npm run dev:server
```

Run backend smoke tests without MongoDB:

```bash
npm run test --workspace=server
```

### REST contract

Authentication uses an `httpOnly` `token` cookie. Browser clients must send
requests with credentials enabled (`credentials: 'include'` or Axios
`withCredentials: true`).

- `/api/auth`: register, login, logout, and current-user session.
- `/api/tasks`: personal and organization task CRUD.
- `/api/tasks/organization/completion`: manager/admin completion report.
- `/api/users`: profile and organization-member reads.
- `/api/organizations`: create, join by invite code, members, roles, settings, and ownership.
- `/api/shifts`: clock in/out, shift listing, corrections, and overlong flags.
- `/api/presence`: heartbeat, presence listing, manager pings, and ping responses.
- `/api/history`: organization and task audit history.

All organization data is scoped to the authenticated user's organization.

### WebSocket contract

Connect to the API origin with `/ws`, for example
`ws://localhost:5000/ws` in development or `wss://api.example.com/ws` in
production. The existing auth cookie authenticates the upgrade. WebSocket
messages use `{ "type": "...", "data": {} }`.

Supported events include `presence:heartbeat`, `presence:ping`,
`presence:respond`, `presence:snapshot`, `presence:update`,
`presence:ping_update`, and `shift:update`. REST remains the source of truth
and fallback when the socket is disconnected.

The current realtime connection registry is single-instance. Use shared state
such as Redis before horizontally scaling WebSocket servers.

## Project layout

```text
Task/     React + Vite frontend and landing page
server/   Express backend scaffold
```

## Vercel

The frontend deployment root is `Task/`. In the Vercel project settings, set
the Root Directory to `Task`, Framework Preset to Vite, Build Command to
`npm run build`, and Output Directory to `dist`. The frontend also includes a
`vercel.json` with the Vite build and output settings.

The Express API is a separate service; deploying this Vite project does not
deploy `server/`. Before the frontend can authenticate, deploy the backend to a
public HTTPS host and set these Vercel **Production** environment variables
before rebuilding:

- `VITE_API_URL`: the reachable backend origin followed by `/api`.
- `VITE_WS_URL`: the same backend origin using `wss://`, followed by `/ws`.

Do not use localhost values in the production Vercel environment. No backend
deployment URL is defined in this repository; use the URL supplied by the
backend hosting provider.

Configure the backend host separately:

- `MONGODB_URI` and `JWT_SECRET` are required private backend variables. Allow
  the backend host to reach the MongoDB Atlas cluster in Atlas Network Access.
- Set `NODE_ENV=production` and `CLIENT_URL` to the exact deployed frontend
  origin, such as `https://task-managements-system-project.vercel.app`.
  Optionally list other exact allowed frontend origins in comma-separated
  `CORS_ORIGINS`. Do not use wildcard origins with credentialed CORS.
- Auth cookies are HttpOnly and Secure in production. `COOKIE_SAMESITE=lax`
  works for same-site deployments. If the frontend and API are on different
  sites, use HTTPS for both and configure `COOKIE_SAMESITE=none`; browsers may
  still restrict third-party cookies, so a shared custom site domain is
  preferable where possible.
- Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and
  `SMTP_FROM` for password-reset email. Verify actual delivery before claiming
  the reset-email flow is production-ready.

The currently deployed frontend was checked and reported a missing
`VITE_API_URL` at runtime. Until the production Vercel variables are set and a
reachable backend URL is provided, production login, signup, and session
restoration cannot be verified.
