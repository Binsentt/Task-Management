# Task Management System

A MERN-ready task management project with a responsive React landing page. The
frontend is an independent Vite application; the Express server is scaffolded
for future backend work and does not yet include task APIs, authentication, or
database integration.

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

Run the frontend tests:

```bash
npm test
```

The Vite frontend in `Task/` uses React, Tailwind CSS v4 through `@tailwindcss/vite`, and
lucide-react. It can be built and run independently of the backend.

## Backend scaffold

Create the local server environment file from the safe example:

```bash
cp server/.env.example server/.env
```

Start the Express server in watch mode:

```bash
npm run dev:server
```

The backend currently only starts Express on the configured `PORT` (default
`5000`). MongoDB, authentication, task APIs, and CRUD operations have not been
implemented.

## Project layout

```text
Task/     React + Vite frontend, landing page, and dashboard UI
server/   Express backend scaffold
```

## Vercel

The frontend deployment root is `Task/`. In the Vercel project settings, set
the Root Directory to `Task`, Framework Preset to Vite, Build Command to
`npm run build`, and Output Directory to `dist`. The frontend also includes a
`vercel.json` with the Vite build and output settings.

## Dashboard integration

`Task/src/pages/DashboardPage.jsx` provides the dashboard UI. Authentication,
database access, and task CRUD remain the responsibility of the other developers.
The landing page remains the default screen. `/dashboard` only renders the dashboard
when `App` receives an `authenticatedUser` from the future verified session provider.
Without that user, it renders the landing page. This UI boundary does not replace
server-side authentication and API authorization.

For a local design preview, run `npm run dev` and open
`http://localhost:5173/?preview=dashboard`. This preview is available only in Vite
development mode and is removed from production builds.

The login developer can pass the verified session user and loaded data:

```jsx
<App
  authenticatedUser={session.user}
  dashboardProps={{ tasks, projects, summary, onNewTask, onNavigate }}
/>
```

`DashboardPage` accepts `user` (`name`), `tasks` (`id`, `title`, `project`,
`dueLabel`, `status`, `color`), `projects` (`id`, `name`, `color`), and `summary`
(`total`, `completed`, `pending`, `projectCount`, `completedThisWeek`,
`completedToday`, `onTrackPercent`). Colors support `indigo`, `blue`, and `emerald`.
Missing data shows zero counts and an empty state rather than fabricated results.
Search filters supplied task data locally. Actions are disabled until their
callbacks are provided: `onNewTask`, `onNavigate`, `onNotifications`, `onProfile`,
and `onTaskSelect`. `onNavigate` receives `tasks`, `calendar`, or `project:<id>`.
