# Web App - Technical Guide

### 🌐 Overview

The Web App is built using **Next.js** with **TypeScript**, styled with **TailwindCSS** and **shadcn/ui components**. It acts as the centralized interface for:

- Fuel allocation
- Trip sheet management
- Role and permission assignment
- Data entry for Tally posting (through Desktop App)

It connects to a custom **Node.js backend** hosted on Render, and syncs with MongoDB Atlas.

---

### 🛠️ Tech Stack

| Feature     | Technology                |
| ----------- | ------------------------- |
| Framework   | Next.js (App Router)      |
| Language    | TypeScript                |
| Styling     | Tailwind CSS, shadcn/ui   |
| Backend API | Node.js (Express)         |
| DB          | MongoDB Atlas             |
| Auth        | Custom auth (JWT/Session) |
| Hosting     | Vercel                    |

---

### 🔧 Local Development

1. Clone the repo:

```bash
git clone https://github.com/lfgraphics/bowser
cd bowser-admin
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env.local`:
   Request from dev or export from [Vercel Project Settings](https://vercel.com/indian-tankers-projects/bowser)

4. Run locally:

```bash
npm run dev
```

App will be available at `http://localhost:3001`

---

### 🔐 Authentication

- Role-based access (Admin, Manager, Bowser Driver, Vehicle Driver, etc.)
- Custom login and token system
- Shared authentication with Mobile App

---

### 🗂️ Features Summary

- **User Management**: Admin creates/manages user roles
- **Trip Sheet Handling**: Create, approve, and finalize bowser trip sheets
- **Fuel Allocation**: Assign fuel requests raised from the mobile app
- **Request Tracking**: Review fueling transactions and update statuses
- **Settlement**: Finalize trips and export data to Tally (via Desktop Bridge)
- **Print View**: Final printable forms for reports
- **Role Assignment**: Set departments and roles of the users

---

### 📦 Deployment

- Live URL: [https://itpl-bowser-admin.vercel.app/](https://itpl-bowser-admin.vercel.app/)
- Hosted on: Vercel [https://vercel.com/indian-tankers-projects/bowser](https://vercel.com/indian-tankers-projects/bowser)
- CI/CD: Automatic via GitHub pushes to main branch

---

### ❌ External API Access

- All APIs are **internal-use only**. No public-facing endpoints.
- API secured via middleware, token validation, and internal header checks

---

### 📋 Contribution Notes

- Maintain type safety using TypeScript
- Use shadcn/ui for consistent component styling
- Use modular folders for `components`, `routes`, `lib`, and `services`

---

### 📬 API Communication

- Uses axios/fetch to communicate with custom Node.js backend on Render
- Backend handles validation, database operations, and Tally integration queueing

---

### 🧪 Testing & QA

- Role simulation (simulate login for different types of users)
- Tally submission logs & responses tested via Desktop App bridge
- Real trip & fueling data verified through field testing

---

### 🧾 Related

- Project Overview: [PROJECT\_OVERVIEW.md](./readme.md)
- Mobile App: [MOBILE\_APP.md](./application/readme.md)
- Desktop App: [DESKTOP\_APP.md](./tally-bridge/readme.md)

