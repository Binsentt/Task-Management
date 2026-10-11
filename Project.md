# TaskTrack – Spec & ERD (v2)

Personal or group remote task tracker. Stack: MERN (MongoDB, Express, React, Node). One organization per user.

## 1. Modes and roles

| Mode / role | Extends | What it is |
| --- | --- | --- |
| Guest | – | No account. Tasks live in browser storage (localStorage). |
| Individual | Guest | Account-backed personal tasks. Can join one organization. |
| Manager | Individual | Org role. Oversees org tasks and time in/out. |
| Admin | Manager | Org role. Full control of the organization. |
| Superadmin (optional) | – | Platform-level flag for the app owner only. Not part of normal org roles. |

A user with no organization is an Individual. Joining an org gives them an org role (member, manager, admin).

## 2. Features

### 2.1 Guest mode

- Task CRUD.
- Checklist per task, with a done toggle. **This is the main feature.**
- Saved in the browser. Same task shape as the server so it can be imported later.

### 2.2 Individual mode (extends guest)

- Tasks saved to the account and synced across devices.
- One-time import of guest tasks on sign-up.
- Can create or join one organization (via invite code or email invite).

### 2.3 Organization

- Shared tasks, with optional assignment to members.
- Per-task history (audit log).
- Member list with roles.
- Remote shift tracker: time in / time out, optionally linked to a task.

### 2.4 Manager (extends individual)

- View all org tasks and assign them.
- View all members' shifts. Correct a shift with a note.
- Invite and remove members. Cannot change admins.

### 2.5 Admin (extends manager)

- Everything a manager can do, plus: promote or demote roles, edit org settings, transfer ownership, delete the organization.

## 3. Permission matrix

| Action | Individual (no org) | Member | Manager | Admin |
| --- | --- | --- | --- | --- |
| CRUD own personal tasks | ✓ | ✓ | ✓ | ✓ |
| View org tasks | – | ✓ | ✓ | ✓ |
| Create org tasks | – | ✓ | ✓ | ✓ |
| Edit or delete others' org tasks | – | ✗ | ✓ | ✓ |
| Assign tasks | – | ✗ | ✓ | ✓ |
| Clock in / out | – | ✓ | ✓ | ✓ |
| View all members' shifts | – | own only | ✓ | ✓ |
| Edit others' shifts | – | ✗ | ✓ | ✓ |
| View org history | – | own tasks | ✓ | ✓ |
| Invite / remove members | – | ✗ | ✓ | ✓ |
| Change roles | – | ✗ | ✗ | ✓ |
| Edit org settings / delete org | – | ✗ | ✗ | ✓ |

Enforce in one middleware, for example `requireOrgRole('manager')`, not per route.

## 4. Data model (MongoDB)

Single-org design: the user holds `organizationId` and `orgRole` directly, so there is no `membership` collection.

### 4.1 `users`

| Field | Type | Notes |
| --- | --- | --- |
| \_id | ObjectId |  |
| username | string | unique |
| email | string | unique, lowercase |
| passwordHash | string | never returned by the API |
| organizationId | ObjectId? | null = individual |
| orgRole | enum? | `member` \| `manager` \| `admin`; null when no org |
| systemRole | enum | `user` (default) \| `superadmin` |
| joinedOrgAt | Date? |  |
| createdAt | Date |  |

Rule: `orgRole` is set if and only if `organizationId` is set.

### 4.2 `organizations`

| Field | Type | Notes |
| --- | --- | --- |
| \_id | ObjectId |  |
| name | string |  |
| ownerId | ObjectId | the founding admin |
| inviteCode | string? | rotatable, unique |
| settings | object | timezone, shift rules (for example max shift hours) |
| createdAt | Date |  |

No `tasks[]` array. Tasks point to the org instead.

### 4.3 `invitations` (optional, needed if you invite by email)

| Field | Type | Notes |
| --- | --- | --- |
| \_id | ObjectId |  |
| organizationId | ObjectId |  |
| email | string |  |
| role | enum | `member` \| `manager` |
| token | string | unique |
| expiresAt | Date | TTL index |
| invitedBy | ObjectId |  |

### 4.4 `tasks`

| Field | Type | Notes |
| --- | --- | --- |
| \_id | ObjectId |  |
| title | string | required |
| content | string |  |
| createdBy | ObjectId | user |
| assignedTo | ObjectId? | user in the same org |
| organizationId | ObjectId? | null = personal task |
| status | enum | `to_do` \| `in_progress` \| `done` |
| priority | enum? | `low` \| `medium` \| `high` |
| dueDate | Date? |  |
| completedAt | Date? | set when status becomes `done`, cleared otherwise |
| checklist | array | embedded, see below |
| deletedAt | Date? | soft delete |
| createdAt / updatedAt | Date |  |

**Embedded `checklist[]` item:** `{ _id, text, isDone, order }`

Why embedded: checklists are small, always loaded with their task, and this matches the guest-mode shape in localStorage. If you want a task to auto-complete when all items are done, do it in the task update logic, not as a separate collection.

### 4.5 `history`

| Field | Type | Notes |
| --- | --- | --- |
| \_id | ObjectId |  |
| taskId | ObjectId |  |
| organizationId | ObjectId | org tasks only |
| userId | ObjectId | who did it |
| action | enum | `created` \| `updated` \| `status_changed` \| `assigned` \| `checklist_toggled` \| `deleted` \| `restored` |
| changes | object | `{ field: { from, to } }` |
| timestamp | Date |  |

Append-only. Never edited or deleted by the app. Written in the same service function that changes the task.

### 4.6 `remoteShifts`

| Field | Type | Notes |
| --- | --- | --- |
| \_id | ObjectId |  |
| userId | ObjectId |  |
| organizationId | ObjectId |  |
| taskId | ObjectId? | optional link to the task worked on |
| timeIn | Date | UTC |
| timeOut | Date? | null while the shift is open |
| note | string? |  |
| editedBy | ObjectId? | set when a manager corrects the shift |

Rules:

- At most one open shift per user (`timeOut: null`). Check before clock-in.
- `timeOut` must be after `timeIn`.
- Duration is computed on read, not stored.

## 5. Relationships

```
organizations 1 ──< users          (users.organizationId)
organizations 1 ──< tasks          (tasks.organizationId, nullable)
organizations 1 ──< history
organizations 1 ──< remoteShifts
organizations 1 ──< invitations
users         1 ──< tasks          (createdBy, assignedTo)
users         1 ──< remoteShifts
tasks         1 ──< history
tasks         1 ──< checklist[]    (embedded)
```

## 6. Indexes

- `users`: unique `email`, unique `username`, `organizationId`
- `organizations`: unique sparse `inviteCode`
- `tasks`: `(organizationId, status)`, `assignedTo`, `createdBy`
- `history`: `(organizationId, timestamp desc)`, `taskId`
- `remoteShifts`: `(userId, timeOut)`, `(organizationId, timeIn desc)`
- `invitations`: unique `token`, TTL on `expiresAt`

## 7. Edge cases to decide

1. **Leaving or removal:** what happens to a user's org tasks? Suggested: tasks stay in the org, `assignedTo` is cleared, and the user's personal tasks stay with them.
2. **Last admin:** block demotion or leaving if they are the only admin. Require ownership transfer first.
3. **Guest import:** import guest tasks once on sign-up, using client-generated IDs and a `schemaVersion` field. Clear localStorage after a successful import.
4. **Personal task moved into an org:** allow only for the creator, and write a history entry.
5. **Auth:** JWT in an httpOnly cookie, bcrypt or argon2 for `passwordHash`. Check org role on the server for every org route.

## 8. Suggested build order

1. Guest mode: task CRUD, checklist, localStorage. Ship this first as it is the main feature.
2. Auth and individual mode: users, tasks sync, guest import.
3. Organizations: create/join, roles, org tasks, assignment.
4. History log.
5. Remote shifts: clock in/out, manager view, corrections.
6. Admin controls and polish.


