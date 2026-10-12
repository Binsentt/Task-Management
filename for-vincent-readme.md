# Vincent Setup Guide

This guide sets up the Task Management frontend and backend locally.

## 1. Requirements

Install:

- Node.js 20.19+ or 22.12+
- npm 10+
- A MongoDB Atlas account and cluster

## 2. Install dependencies

From the project root:

```bash
npm install
```

## 3. Configure MongoDB Atlas

1. Open MongoDB Atlas.
2. Open the project containing the database cluster.
3. Go to **Database Access**.
4. Create a database user if one does not exist.
   - This is not necessarily the same as your Atlas website login.
   - Give the user the permissions needed by this development database.
5. Go to **Network Access**.
6. Add your current IP address.
   - `0.0.0.0/0` allows every IP and should only be used temporarily for development.
7. Open **Database > Connect > Drivers**.
8. Select **Node.js** and copy the connection string.

The MongoDB URI should look like this:

```text
mongodb+srv://<database-user>:<url-encoded-password>@<cluster-host>/<database-name>?retryWrites=true&w=majority
```

Example shape only:

```text
mongodb+srv://task_user:password@cluster0.example.mongodb.net/task-management?retryWrites=true&w=majority
```

Replace the placeholders with your real database user, password, cluster host, and database name. Do not commit the real URI.

If the password contains characters such as `@`, `:`, `/`, `?`, or `#`, URL-encode the password first.

## 4. Generate a JWT secret

Run this command from any terminal:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the generated value into `JWT_SECRET`. It must be at least 32 characters long. Keep it private and never put it in the frontend environment file.

## 5. Create the backend environment file

From the project root:

```bash
cp server/.env.example server/.env
```

Open `server/.env` and use:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<database-user>:<url-encoded-password>@<cluster-host>/<database-name>?retryWrites=true&w=majority
JWT_SECRET=<generated-secret>
CLIENT_URL=http://localhost:5173
NODE_ENV=development
COOKIE_SAMESITE=lax
```

Use `MONGODB_URI` exactly. Do not write `MONGO_URI` or use YAML-style `MONGODB_URI:` syntax.

Never commit `server/.env`.

## 6. Create the frontend environment file

From the project root:

```bash
cp Task/.env.example Task/.env.local
```

The frontend file should contain only public URLs:

```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000/ws
VITE_APP_ENV=development
```

Never put `JWT_SECRET`, `MONGODB_URI`, database passwords, or private keys in `Task/.env.local`.

## 7. Start the backend

Open a terminal in the project root and run:

```bash
npm start --workspace=server
```

A successful startup should show:

```text
MongoDB connected
Server running on http://localhost:5000
```

Check the health endpoint in another terminal:

```bash
curl http://localhost:5000/api/health
```

## 8. Start the frontend

Open another terminal and run:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, normally:

```text
http://localhost:5173
```

Use `localhost` consistently for both frontend and backend. Do not mix it with `127.0.0.1` while testing cookies.

## 9. Run checks

Backend smoke tests:

```bash
npm test --workspace=server
```

Frontend tests:

```bash
npm test
```

Frontend production build:

```bash
npm run build
```

## 10. Common problems

### MongoDB `ReplicaSetNoPrimary` or connection failure

Check:

- The Atlas cluster is running and healthy.
- Your current IP is in **Network Access**.
- The database username/password are correct.
- The password is URL-encoded inside the URI.
- You copied the URI from **Connect > Drivers**.

### CORS or cookie problems

Check:

- Backend has `CLIENT_URL=http://localhost:5173`.
- Frontend has `VITE_API_URL=http://localhost:5000/api`.
- Axios uses credentials, which is already configured in the project.
- Both applications use `localhost`.

### JWT startup error

Generate a new secret with the Node command above and make sure `JWT_SECRET` is at least 32 characters.

## Security reminder

Do not commit or send these files:

```text
server/.env
Task/.env.local
```

Only commit the example files:

```text
server/.env.example
Task/.env.example
```
