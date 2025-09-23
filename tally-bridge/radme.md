# Desktop App (Tally Bridge) - Technical Guide

### 🖥️ Overview
The Desktop App is an Electron-based utility developed to serve as a bridge between the **Web Application** and **Tally Accounting Software**, bypassing **CORS restrictions**.

It performs two main roles:
1. **Receives XML payloads from the Web App**
2. **Forwards them to the local Tally server** via `localhost:9000`
3. **Syncs data** from local MongoDB to MongoDB Atlas

---

### 🛠️ Tech Stack
- **Framework**: Electron.js
- **Backend**: Node.js
- **UI**: HTML + JavaScript
- **Database**: MongoDB (Local)

---

### 🧩 Setup & Run (Local Dev)
1. Clone the repo:
```bash
git clone https://github.com/lfgraphics/bowser
cd tally-bridge
```
2. Install dependencies:
```bash
npm install
```
3. Start Electron app:
```bash
npm start
```

---

### ⚙️ Production Build
To package the desktop app for distribution:
```bash
npx electron-builder --win
```
> This will generate the `.exe` file using `electron-builder` for Windows.

### 🔄 CI/CD: Publishing the EXE Installer

Here's a command example to publish your Electron-built Windows installer via GitHub Releases:

```bash
# Tag the release (must match package.json version)
git tag v1.9.0 #must update the version code accordingly
git push origin v1.9.0

# Upload .exe and .yml file
gh release create v1.9.0 "./dist/Tally Bridge Setup 1.9.0.exe" "./dist/latest.yml" --title "Tally Bridge v1.9.0" --notes "DB connection IP updated"

gh release upload exe "./tally-bridge/dist/TallyBridge setup 1.8.0.exe"  --clobber
gh release edit exe --title "Android Build v64" --notes "Bug fixes and performance improvements"
```
> This command creates a release under the exe tag, uploads your .exe file, and sets the title and changelog accordingly.

**Note**: Windows Defender will show a warning for unknown publisher. Click **"More info" → "Run anyway"** to continue installation. This is expected in local/test builds.

---

### 🧪 Functionality
- **Tally XML Forwarding**:
  - Intercepts Web App POST requests
  - Sends them to `http://localhost:9000` (Tally)
  - Displays logs with timestamps and status

- **Sync Operations**:
  - Connects local MongoDB instance to MongoDB Atlas
  - Syncs collections: `tripSheets`, `vehicles`, `drivers`, etc.
  - UI shows sync logs and next sync interval

---

### 🔁 IPC Events Handled
- `run-manual-sync` – Triggers immediate sync
- `set-sync-interval` – Enables auto-sync
- `stop-sync-interval` – Stops auto-sync
- `get-sync-logs` – Returns latest logs for UI
- `get-next-sync-time` – UI component
- `check-tally-status` – Pings `localhost:9000` and returns response


---

### 📂 Output Directory
- Executables are located under `dist/` folder after build.
- You can distribute the `.exe` to clients and offices for Tally integration.

---

### 🔐 Security Notes
- Tally server communication is limited to local environment
- Only local MongoDB connection is used for sync logic

---

### 🆘 Troubleshooting
- **No response from Tally**: Ensure Tally is running and listening on port 9000
- **Mongo sync fails**: Check local MongoDB and internet connection
- **Logs not updating**: Refresh or restart the app. Logs are written in session only.

---

### 🧾 Related
- Project Overview: [PROJECT_OVERVIEW.md](../readme.md)
- Mobile App: [MOBILE_APP.md](../application/readme.md)
- Web App: [WEB_APP.md](../bowser-admin/readme.md)

