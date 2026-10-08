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

Run the landing-page tests:

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
Task/     React + Vite frontend and landing page
server/   Express backend scaffold
```

## Vercel

The frontend deployment root is `Task/`. In the Vercel project settings, set
the Root Directory to `Task`, Framework Preset to Vite, Build Command to
`npm run build`, and Output Directory to `dist`. The frontend also includes a
`vercel.json` with the Vite build and output settings.
