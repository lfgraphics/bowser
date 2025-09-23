# Backend - Technical Guide

### 🧠 Overview

The backend is a **Node.js** application using **Express.js**. It acts as the central API server for:

- Mobile App (Expo-based)
- Web App (Next.js)
- Tally Sync (via Desktop App)

It connects to **MongoDB Atlas** (primary) and optionally supports local MongoDB for bridge syncing. Hosted on **Render** with environment variable support.

---

### 🛠️ Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB Atlas + Local MongoDB (via desktop bridge)
- **Auth**: Custom JWT-based auth
- **Storage**: GridFS / Base64 fields (for slip images)
- **Host**: Render.com

---

### 🔧 Local Development Setup

1. Clone the repo:

```bash
git clone https://github.com/lfgraphics/bowser
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file with the following sample:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<dbname>
JWT_SECRET=your_secret_key_here
```

4. Start server locally:

```bash
npm run dev
```

Server will run on `http://localhost:5000`

---

### 🔐 Authentication

- JWT Token-based login system
- Shared across Mobile and Web
- Middleware protected routes based on roles

---

### 🔁 API Routes Overview

| Method | Endpoint                 | Purpose                            |
| ------ | ------------------------ | ---------------------------------- |
| POST   | `/auth/login`            | User login                         |
| GET    | `/tripSheet/:id`         | Fetch trip sheet by ID             |
| POST   | `/fueling`               | Submit fueling data                |
| POST   | `/allocate`              | Allocate fuel request to a bowser  |
| ...    | (see repo for full list) | Module-specific routes per feature |

---

### 🔄 MongoDB Sync Strategy

- Sync script is bundled in the **desktop bridge app**
- Exports from local → cloud with merge & conflict resolution logic
- Sync interval can be configured and logs tracked from the Electron UI

---


### 📦 Production Hosting

- Hosted on **Render.com**
- Uses `.env` variables stored in the Render dashboard
- Mongo Atlas used as primary DB

---

### 🚫 Public Access

- APIs are not publicly exposed
- All clients authenticated before accessing endpoints
- Cross-origin requests are allowed only for trusted domains

---

### 🧾 Related

- Project Overview: [PROJECT\_OVERVIEW.md](../readme.md)
- Mobile App: [MOBILE\_APP.md](../application/radme.md)
- Desktop App: [DESKTOP\_APP.md](../tally-bridge/raedme.md)
- Web App: [WEB\_APP.md](../bowser-admin/readme.md)

