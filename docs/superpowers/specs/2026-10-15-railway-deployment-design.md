# Railway Deployment Design

## Goal

Deploy the Task Management monorepo into a new Railway project with separate
frontend and backend services. The backend must provide REST and authenticated
WebSocket access, and the frontend must build with production URLs. MongoDB
Atlas remains the database provider. SMTP is intentionally disabled for this
deployment.

## Architecture

### Backend service

- Source: repository root.
- Build/deploy: existing root `railway.json`.
- Runtime: `npm run start --workspace=server`.
- Public routes:
  - REST API under `/api`.
  - WebSocket upgrades under `/ws`.
  - Health check at `/api/health`.
- Replicas: one, because the current WebSocket connection registry is
  process-local.
- Secrets/configuration:
  - `MONGODB_URI`: provided Atlas URI, stored as a Railway secret.
  - `JWT_SECRET`: generated strong random value, stored as a Railway secret.
  - `NODE_ENV=production`.
  - `COOKIE_SAMESITE=none`.
  - `CLIENT_URL` and `CORS_ORIGINS`: the exact generated frontend origin,
    configured after the frontend domain exists.
  - `PORT`: supplied by Railway.
  - SMTP variables: empty/unconfigured, so password-reset requests report that
    email delivery is unavailable rather than claiming success.

### Frontend service

- Source: same repository, root directory `Task`.
- Build: `npm run build`.
- Runtime: a production static-file server serving `dist` with SPA fallback.
- Build-time variables:
  - `VITE_API_URL=https://<backend-domain>/api`.
  - `VITE_WS_URL=wss://<backend-domain>/ws`.
  - `VITE_APP_ENV=production`.

### Data flow

1. The backend deploys and receives its generated Railway domain.
2. The frontend is built with the backend HTTPS and WSS URLs.
3. The frontend receives its generated Railway domain.
4. Backend CORS and cookie settings are updated with the exact frontend origin.
5. Backend is redeployed so the final cross-site cookie configuration is active.

## Alternatives considered

1. **Vercel frontend plus Railway backend**: less static-serving work, but the
   frontend would not be contained in the requested Railway project.
2. **Single combined service**: fewer resources, but frontend and backend
   deployments become coupled and the monorepo build is harder to isolate.
3. **Two Railway services**: keeps deployment boundaries clear, supports the
   existing backend manifest, and keeps all application infrastructure in one
   project. This is the selected design.

## Error handling and safety

- Do not place MongoDB credentials or JWT secrets in source control, frontend
  variables, build output, or logs.
- Do not report deployment success until Railway reports `SUCCESS`.
- Treat a failed health check, database connection, CORS mismatch, or
  WebSocket failure as a deployment failure requiring diagnosis.
- Keep the backend at one replica until WebSocket state is moved to shared
  infrastructure.

## Verification

- Run targeted backend and frontend tests before deployment.
- Confirm backend deployment reaches `SUCCESS`.
- Confirm `GET /api/health` reports database readiness.
- Confirm frontend domain returns the application and a direct client-side
  route refresh returns the SPA.
- Confirm frontend API and WebSocket configuration points to the backend
  domain.
- Exercise signup/login/session restoration and a basic task request.
- Confirm the WebSocket endpoint accepts an authenticated connection.
- Confirm password-reset behavior clearly reports SMTP being disabled.
