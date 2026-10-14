# Backend development and Railway readiness

## Local development

The existing local backend port is **5000**. Vite binds to **5174** with a strict
port so its exact origin matches the backend CORS configuration.

From the repository root, run `npm run dev:server` and `npm run dev` in separate
terminals. `npm start` runs the backend without nodemon.

Use `server/.env.example` to prepare private local configuration. Keep local
`NODE_ENV=development`, `CLIENT_URL=http://localhost:5174` and
`COOKIE_SAMESITE=lax`. Frontend development defaults are
`http://localhost:5000/api` and `ws://localhost:5000/ws`; explicit Vite values
override them. Do not copy production frontend settings into local configuration.

Windows Atlas SRV lookups use the operating system's configured IPv4 DNS
resolvers. A failed resolver lookup falls back safely and is reported without
printing private details. Check VPN/firewall/DNS configuration if SRV lookups fail.

## Isolated tests

`npm run test --workspace=server` runs unit tests and explicitly skips database
integration cases when `TEST_MONGODB_URI` is absent. Integration tests never
load `server/.env` and never fall back to `MONGODB_URI`.

Supply `TEST_MONGODB_URI` privately through the current shell or a secret manager.
It must select a separate database ending in `_test` or `_test_<suffix>`, and must
not select the configured production database. Use a separate database account
with access only to that test database when available. Atlas transactions require
a replica set. `TEST_JWT_SECRET` is optional; tests otherwise generate a temporary
secret. Tests disable SMTP to prevent sending real messages.

## Railway production settings

Select project **task-management-production**, environment **production**, service
**task-management-api** in the Railway dashboard.

1. In **Variables**, set `MONGODB_URI` using the existing Atlas driver URI and set
   `JWT_SECRET` to the existing strong private secret, at least 32 characters.
   Enter them directly in Railway's secret controls; do not put values in chat,
   source control, logs, or frontend variables.
2. Verify `NODE_ENV=production`,
   `CLIENT_URL=https://task-managements-system-project.vercel.app`, and
   `COOKIE_SAMESITE=none`. Production cookies are HttpOnly and Secure.
3. For deployment from the repository root, use the root `railway.json`:
   `npm run start --workspace=server`, health path `/api/health`, timeout 300 seconds.
   If the service uses `server/` as its root, use `npm start` and configure that
   health path and timeout in the dashboard. Do not run the frontend build for this API.
4. Railway assigns `PORT`; the backend validates it and listens on `0.0.0.0`.
   Initial database selection is bounded at 10 seconds. Health is 200 only while
   Mongoose is connected and 503 while a running server has lost its database.
5. Wait for explicit deployment approval before applying/deploying the staged
   settings or code. A redeploy of an old build does not include uncommitted local code.
6. After deployment, inspect safe runtime diagnostics and check the public
   `/api/health` response. A timed-out request is not proof of a healthy service.

## Atlas checks if connectivity fails

In the correct Atlas project, confirm the existing cluster is available. In
**Database Access**, check the existing database user and required permissions.
Use a database-user password, not an Atlas account password; encode special
characters in the driver URI. Confirm the URI selects the intended database and
retains the appropriate authentication source and Atlas connection options.

In **Network Access**, verify the actual client's outbound IP is permitted. Local
development and Railway may use different outbound addresses. Prefer the required
specific addresses or approved private/static networking; do not broaden the
allowlist unnecessarily. Diagnose DNS, TLS, and authentication separately. A
read-only MongoDB `ping` verifies connectivity without creating data or indexes.

Railway secret writes were denied by automatic approval review in this chat. Use
the dashboard for those values until that access/approval boundary is resolved.
No production deployment is authorized in the current request.
