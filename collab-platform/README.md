# 🚀 OfficeOrbit — Collaborative Project Management Platform

A modern, full-stack, real-time multi-user collaborative project management platform built for speed, reliability, and seamless teamwork.

---

## 🌟 Key Features

1. **Role-Based Access Control (RBAC)**
   - **Admin**: Full system control — manage all users, create/delete projects, assign Project Managers, and monitor system activity logs.
   - **Project Manager (PM)**: Manage assigned projects, add/remove team members, create/update/delete tasks, assign tasks, and track project activity.
   - **Team Member**: View assigned projects, track tasks, change task statuses, add comments, and receive real-time notifications.
   - **Viewer**: Read-only access to assigned projects, tasks, and discussions.

2. **Real-time WebSockets Engine (Socket.IO)**
   - Room-based WebSocket scoping per project (`project:<id>`).
   - Changes (task created/updated/deleted, new comments, status changes) are broadcast instantly to all connected project members without manual page refreshes.
   - React Query cache invalidation triggers seamless UI state sync.

3. **Optimistic Concurrency Control (Conflict Detection)**
   - Every task carries an atomic integer `version` property.
   - When a user submits an update, the backend checks `WHERE id = :id AND version = :expectedVersion`.
   - If another user updated the task in the interim, the API returns **`HTTP 409 Conflict`** with the latest server state.
   - The frontend displays an interactive **Side-by-Side Conflict Resolution Modal**, allowing users to either overwrite with their draft changes or reload the latest server state.

4. **Activity Logs & Audit Trail**
   - Automatically logs all project events (task creation, status transitions, member additions/removals).
   - Real-time activity feed visible per project.

5. **Notification System**
   - In-app notification bell with unread counter.
   - Instant WebSocket notifications when assigned to a task or mentioned in comments.

---

## 🛠️ Architecture & Tech Stack

### **Backend (`/backend`)**
- **Framework**: NestJS (TypeScript, CommonJS module resolution)
- **Database**: PostgreSQL 16
- **ORM**: Prisma ORM v6
- **Real-time Gateway**: NestJS WebSockets (`@nestjs/websockets`, `socket.io`)
- **Authentication**: JWT & Passport (`passport-jwt`, `bcryptjs`)
- **API Documentation**: Swagger UI at `http://localhost:3001/api/docs`

### **Frontend (`/frontend`)**
- **Framework**: Next.js (App Router, React 19)
- **State Management**: Zustand (Auth persistence) & React Query (`@tanstack/react-query`)
- **Real-Time Context**: Socket.IO Client (`socket.io-client`)
- **Styling**: Tailwind CSS v4 (Glassmorphism dark theme, custom responsive components)
- **Icons**: Lucide React

---

## 🔐 Role Capabilities Matrix

| Feature / Action | Admin | Project Manager | Team Member | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| **System User Admin** | ✅ | ❌ | ❌ | ❌ |
| **Create / Delete Projects** | ✅ | ✅ | ❌ | ❌ |
| **Add / Remove Project Members** | ✅ | ✅ | ❌ | ❌ |
| **Create / Update / Delete Tasks** | ✅ | ✅ | ✅ (Assigned) | ❌ |
| **Change Task Status** | ✅ | ✅ | ✅ | ❌ |
| **Post Comments** | ✅ | ✅ | ✅ | ❌ |
| **View Projects & Tasks** | ✅ | ✅ | ✅ | ✅ |

---

## 🔑 Demo Login Credentials

All seeded test accounts use the password: **`Admin@123`**

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| 👑 **Admin** | `admin@collab.dev` | `Admin@123` | Full system control |
| 📋 **Project Manager** | `pm@collab.dev` | `Admin@123` | Project lead |
| 💻 **Team Member** | `dev@collab.dev` | `Admin@123` | Developer / Collaborator |
| 💻 **Team Member 2** | `dev2@collab.dev` | `Admin@123` | Developer / Collaborator |
| 👁️ **Viewer** | `viewer@collab.dev` | `Admin@123` | Read-only access |

*Note: Enter any of the credentials above in the email & password fields, or click **Sign Up** to create your own custom account with your chosen role.*

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ or v24+
- **PostgreSQL**: v14+ running on `localhost:5432`

---

### Step 1: Database Setup & Migration

```bash
cd collab-platform/backend

# Install backend dependencies
npm install

# Run Prisma schema push to PostgreSQL
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Seed sample users, projects, tasks, comments, and activity logs
npm run db:seed
```

---

### Step 2: Start Backend Server

```bash
cd collab-platform/backend
npm run start:dev
```
Backend will start on `http://localhost:3001`
Swagger API Documentation: `http://localhost:3001/api/docs`

---

### Step 3: Start Frontend Client

```bash
cd collab-platform/frontend

# Install frontend dependencies
npm install

# Start Next.js development server
npm run dev
```
Frontend will be live at `http://localhost:3000`

---

## ⚡ Concurrency & Real-Time Technical Details

### Real-Time WebSocket Architecture
1. Upon logging in, the frontend establishes a JWT-authenticated Socket.IO connection to `http://localhost:3001`.
2. When navigating into a project (`/projects/:id`), the client emits `join:project` with the project ID.
3. When any user mutates state (creates task, changes status, posts comment), the NestJS backend handles the database transaction and emits event `task:created`, `task:updated`, or `comment:created` to room `project:<id>`.
4. Connected clients receive the event and invalidate relevant React Query keys (`queryClient.invalidateQueries(['project-tasks', id])`), keeping all open browser windows seamlessly updated in real time.

### Version-Based Optimistic Concurrency Control
```typescript
// Backend Tasks Service
const updatedTask = await this.prisma.task.updateMany({
  where: {
    id,
    version: dto.version, // Verify client version matches current DB version
  },
  data: {
    ...updatePayload,
    version: { increment: 1 }, // Atomically increment version
  },
});

if (updatedTask.count === 0) {
  const currentTask = await this.prisma.task.findUnique({ where: { id } });
  throw new ConflictException({
    message: 'Task was modified by another user.',
    currentTask,
  });
}
```
When HTTP 409 is returned, the Next.js frontend intercepts the error and presents a side-by-side comparison modal displaying the user's draft values vs. the latest server data.
