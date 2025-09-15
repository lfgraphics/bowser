# Mobile App - Technical Guide

### 📱 Overview

This is the official mobile app of the Bowser Fuel Management System. It is built with **Expo (React Native)** and intended for:

- Bowser Drivers
- Vehicle Drivers
- Loading In-Charges
- Diesel Control Center Staff

All app interfaces are role-based and simplified for on-field usage.

---

### 🛠️ Tech Stack

- **Platform**: Expo (React Native)
- **Language**: JavaScript
- **Backend**: Node.js API
- **Database**: MongoDB Atlas

---

### 📦 Build Commands

You must install the [EAS CLI](https://docs.expo.dev/eas-update/getting-started/):

```bash
npm install -g eas-cli
```

**For Development APK:**

```bash
eas build -p android --profile development
```

**For Production APK:**

```bash
eas build -p android --profile production
```

**Publish the APK through GitHub Release**

```bash
gh release upload apk ./builds/latest.apk --clobber # update the file path accordingly
gh release edit apk --title "Android Build v64" --notes "Bug fixes and performance improvements" #update the title and notes according tothe update
                 or
eas build --platform android --auto-submit #now you can use this command directly to build and submit to play store in one go, it is now configured
```

> This will publish or update the `.apk` file under the `apk` tag using **GitHub Releases**. Your UI's `/download` page automatically fetches this release for easy one-click downloads for users.

The file download URL and release info will reflect immediately without needing to update your frontend code manually.

---

### 🔧 Setup (Local Development)

1. Clone the repo:

```bash
git clone https://github.com/lfgraphics/bowser
cd application
```

2. Install dependencies:

```bash
npm install
```

3. Run in development:

```bash
npx expo start --dev-client
```

> You must have the custom dev client installed or use Expo Go (with limited support).

---

### 📱 Installation (Production Use)

- **APK URL**: Provided internally via Expo build links or hosted APK
- **iOS Support**: Possible via Apple Developer Account (not built yet)

---

### 📍 Permissions Required

- **Camera**: For uploading slip photos & verification images
- **Location**: For GPS tracking, fueling coordination, and logging

---

### 👤 Role-Specific Interfaces

- **Bowser Driver**: View allocations, submit fueling data, return trip initiation
- **Vehicle Driver**: Raise fueling request, status updates (loaded/unloaded), location sharing

---

### 💬 Notes for Developer

##### 🧪 MongoDB Cleanup Command

If a **bowser driver** gets a duplicate fueling request or incomplete request and wishes to remove one:

```json
{
  $and:[
    {"bowser.driver.name":"driver's Name"},
    {"vehicleNumber": { $regex: "Vehile number", $options: "i" }}
  ]
}
```

> 🔒 Use this with caution. Only run with proper verification.

---

### 🔐 Authentication

- The mobile app uses the **same authentication system as the web app**.
- Secure login with encrypted passwords
- Role-based content loading

---

### 🧪 Testing Notes

- Test camera and GPS permissions on real device
- Validate role-based login redirection
- Verify offline support and sync logic

---

### 🆘 Support

Contact [@lfgraphics](https://github.com/lfgraphics) or your designated admin for:

- Role setup issues
- Sync-related errors
- APK download access

---

### 📁 Related

- Web App: [WEB\_APP.md](../bowser-admin/readme.md)
- Desktop App: [DESKTOP\_APP.md](../tally-bridge/readme.md)
- Project Overview: [PROJECT\_OVERVIEW.md](../readme.md)

