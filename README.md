# OfficeOrbit 🪐

OfficeOrbit is a modern workspace orchestration ecosystem designed for hybrid work management, employee presence tracking, and multi-user real-time team collaboration.

---

## 🏗️ Repository Architecture & Sub-Projects

```
OfficeOrbit/
├── collab-platform/          # Full-Stack Collaborative Project Management Platform (Hackathon Edition)
│   ├── backend/              # NestJS + PostgreSQL + Prisma ORM + Socket.IO + JWT Auth
│   └── frontend/             # Next.js 14 + TailwindCSS + Zustand + React Query
├── mobile/                   # React Native + Expo App (Geofencing Presence Tracker)
├── web-dashboard/            # React + Vite Analytics Dashboard
└── README.md
```

---

## ⚡ 1. Collaborative Project Management Platform (`/collab-platform`)

A multi-user collaborative project management platform supporting **4 Role Levels**, **Real-Time WebSockets**, and **Optimistic Concurrency Control (HTTP 409 Conflict Resolution)**.

### Key Highlights
- 👑 **Role-Based Access Control (RBAC)**: Admin, Project Manager, Team Member, Viewer.
- ⚡ **Real-Time WebSockets Engine**: NestJS Socket.IO gateway with project room scoping (`project:<id>`).
- 🛡️ **Optimistic Concurrency Control**: Task versioning checks (`WHERE id = :id AND version = :expectedVersion`) with side-by-side conflict resolution UI on HTTP 409.
- 📊 **Activity Logs & Audit Trail**: Real-time event logging per project.
- 🔔 **Real-Time Notifications**: Instant WebSocket alerts for task assignments and comments.

### Demo Login Credentials
*Password for all test users:* **`Admin@123`**

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| 👑 **Admin** | `admin@collab.dev` | `Admin@123` | Full system control |
| 📋 **Project Manager** | `pm@collab.dev` | `Admin@123` | Project lead |
| 💻 **Team Member** | `dev@collab.dev` | `Admin@123` | Developer / Collaborator |
| 👁️ **Viewer** | `viewer@collab.dev` | `Admin@123` | Read-only access |

### Quick Start (Collab Platform)
```bash
# 1. Setup Backend
cd collab-platform/backend
npm install
npx prisma db push
npx prisma generate
npm run db:seed
npm run start:dev   # Backend running on http://localhost:3001

# 2. Setup Frontend
cd collab-platform/frontend
npm install
npm run dev         # Frontend running on http://localhost:3000
```

For full documentation on the Collaborative Platform, see [`collab-platform/README.md`](file:///c:/Users/viswe/Documents/dev-apps/OfficeOrbit/collab-platform/README.md).

---

## 📍 2. Hybrid Work Presence & Analytics Platform

- **Automated Presence**: Passive geofencing detects office entry/exit without manual "punch-ins."
- **Hybrid Analytics**: Real-time calculation of WFO percentages and minimum presence thresholds.
- **Privacy-First**: Stores boolean presence status and timestamps; no raw GPS coordinates are persisted.
- **Workation Handling**: Integrated leave and "work-from-anywhere" logic.

### Tech Stack
- **Mobile (FE)**: React Native + Expo (Cross-platform Geofencing)
- **Dashboard (FE)**: React + Vite (Analytics dashboard)
- **Backend & DB**: Supabase (PostgreSQL, Auth, and Edge Functions)
- **Language**: TypeScript (Full-stack type safety)