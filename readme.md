# Tankers Trip and Fueling Management System - Project Overview

### 🚚 Project Title
**Tankers Trip and Fueling Management System**

### 🏢 Client
**Indian Tankers Pvt. Ltd.**

### 👨‍💻 Developed By
**Lead Developer**: [Taha Kazmi](https://github.com/lfgraphics)  
**Project Manager**: Mohd Sohrab Mekrani (15+ yrs experience, SRS Author)  
**UI/UX Design Assistance**: Mr. Ranjeet

---

### 📆 Project Timeline
- **Start Date**: October 3, 2024  
- **Completion Date**: April 14, 2025  
- **Estimated Duration**: 6–8 months  
- **After 14-4-25 we moved to the trips management module while maintaining the existing bowser fueling module.**

---
# Bowsers Fueling Management System
### 🌐 System Overview
This system digitizes and streamlines the bio-fuel distribution process for Indian Tankers Pvt. Ltd. The core objective is to track bowser calibration, bowser fuel loading, trip sheet generation, vehicle fueling, and accounting reconciliation through a distributed yet synchronized multi-platform solution:

- **Mobile App** (Expo – Android/iOS): For bowser and tanker drivers
- **Web App** (Next.js): For admin and operations staff
- **Desktop App** (Electron.js): Acts as a CORS-free bridge to Tally

All components are integrated with a centralized backend and MongoDB Atlas cloud storage, with local MongoDB support for offline operations.

---

### 🛠️ Technologies Used
| Platform       | Stack                                      |
|----------------|--------------------------------------------|
| **Mobile App** | Expo (React Native), TypeScript            |
| **Web App**    | Next.js, TypeScript, TailwindCSS, ShadCN   |
| **Desktop App**| Electron.js, Node.js, JavaScript           |
| **Backend**    | Node.js, Express.js, MongoDB Atlas         |
| **Hosting**    | Vercel (Web), Render (API), Local distros  |

---

### 🔑 Key Features
- **Modular Role-Based Interface**: Multiple user roles (Admin, Driver, Diesel Supplier, etc.) with tailored views
- **Trip Management**: Trip creation, trip sheet generation, fuel allocation & settlement
- **Tally Integration**: Desktop bridge app to bypass CORS and post bowser trips fueling records to the company's Tally ERP system
- **Mobile Support**: Fuel requests, GPS tracking, fueling records via drivers' mobile app
- **Web Admin Panel**: Allocate resources, manage users, review reports, authorize operations
- **Cloud & Local Sync**: Syncing logic to keep local and cloud databases consistent (manual and scheduled syncs with UI feedback integrated in the Electron app aka Tally Bridge)

---

### ⚙️ System Architecture
The overall workflow is defined in the SRS document, including:
- Flowcharts
- Component interaction
- Entity relationships

The key architectural decision was the use of a **Tally Bridge** desktop app to avoid browser-side CORS issues when pushing XML requests to Tally.

---

### 🚧 Challenges Faced & Solutions
| Problem                            | Solution                                                                          |
|------------------------------------|-----------------------------------------------------------------------------------|
| Tally API does not support CORS    | Developed a locally installed Electron-based bridge app for integration           |
| Local ↔ Cloud Syncing              | Developed manual & scheduled syncing with UI, and sync status tracking            |
| Device-specific requirements       | Created role-specific views and apps (mobile/web/desktop separation)              |
| Real-time data transfer & updates  | Integrated MongoDB with WebSocket-ready structure for future scaling _deprecated_ |
| Tally dosen't return time, monogodb needs time, setting the UTC Hours to 0, 0, 0, 0 led to shortning of date by -1 day in some cases | Handled it by adjusting UTCHours to 0, 0, 1, 800 as default and used a synthetic field 'tripDay' to get the trips' start date without time |
| Many vehicles were having multiple trips on the same day, so sorting by date only was not sufficient | Added a field 'rankindex' to the trip schema to differentiate trips on the same day and used it in combination with 'tripDay' for sorting |
| Reports Viewing issue, for big datasets users were facing issues, filtering and sorting was required in each table | Created Excel like table component and used in the project have hosted as an npm package [@cvians-excel-table](https://www.npmjs.com/@codvista/cvians-excel-table) and maintanig it as a separate project |

---

### 🔮 Future Enhancements
- Real-time GPS tracking for tankers
- Status-based workflow (e.g., loading, unloading, in transit)
- Improved analytics/reporting dashboards

---

### 📁 Repositories & Deployment
- GitHub: [https://github.com/lfgraphics/bowser](https://github.com/lfgraphics/bowser)  
- Web App: [https://itpl-bowser-admin.vercel.app/](https://itpl-bowser-admin.vercel.app/)  
- Web App deveelopment url: [https://vercel.com/indian-tankers-projects/bowser](https://vercel.com/indian-tankers-projects/bowser)  
- Expo Project: [https://expo.dev/accounts/itplfirebase/projects/bowsers-dispensing](https://expo.dev/accounts/itplfirebase/projects/bowsers-dispensing)

---

### 🚦 Development Process
- **Phase 1**: Developed mobile app for bowser drivers
- **Phase 2**: Developed core web dashboard for management
- **Phase 3**: Developed bridge app for integration with Tally
- **Final Phase**: Testing, error handling, and deployment
- Ongoing maintenance and feature additions based on users feedback and moved towards trips management module

---

### 📜 License
> _No license specified. The code is proprietary and was developed under client contract._

---

### 📞 Contact
For any queries, reach out to the lead developer via [GitHub Issues](https://github.com/lfgraphics/bowser/issues) or contact project manager directly.
