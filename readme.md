# Bowser Fueling & Logistics Management System

## Overview
This project is an enterprise-grade logistics and fuel management platform designed to orchestrate complex vehicle operations, fuel distribution (via bowsers), and trip planning. It serves as a central nervous system for transportation logistics, providing real-time tracking, automated compliance reporting, and optimized resource allocation for large-scale fleets.

## Problem It Solves
Managing a fleet of fuel bowsers and transport vehicles involves intricate coordination to prevent fuel theft, ensure timely deliveries, and maintain compliance. Manual tracking leads to:
*   **Fuel Shrinkage**: Unaccounted fuel loss during loading/unloading.
*   **Operational Inefficiency**: Suboptimal route planning and vehicle utilization.
*   **Data Fragmentation**: Disconnected data between drivers, supervisors, and accounts.
*   **Compliance Risks**: Inaccurate logging of hazardous material transport.

This system eliminates these issues by digitizing the entire lifecycle of a trip—from loading order generation to final proof of delivery.

## Target Users
*   **Logistics Managers**: For fleet oversight, trip planning, and shortage analysis.
*   **Ground Supervisors**: For verifying physical loading/unloading operations.
*   **Drivers**: Using the PWA interface for real-time status updates and digital navigation.
*   **Accounts/Audit Teams**: For reconciliation of fuel dispensed vs. delivered.

## Architecture & Technical Design

### Backend (Node.js & Express)
*   **Modular Architecture**: Logic is separated into distinct domains (`transApp`, `fuelingOrders`, `reports` etc.) for maintainability. (Note: This is a simplified explanation, the actual backend is much more complex and has many more features.)
*   **Resilient Job Processing**: Custom in-memory job queue designed for serverless environments (like Render), ensuring background tasks (e.g., trip recalculations) don't block the main event loop.
*   **Database**: robust MongoDB schema design with Mongoose.
    *   **Performance Optimization**: Implements connection pooling and read-replica support patterns for high-load operations.
    *   **Concurrency Control**: Uses `circuit-breaker` patterns and optimistic locking during batch vehicle updates to prevent write conflicts.
    *   **Advanced Aggregation**: Heavy reliance on MongoDB aggregation pipelines and `facets` for generating complex statistical summaries efficiently.

### Web Admin Portal (`bowser-admin`)
*   **Modern Stack**: Built with Next.js 16 (App Router) and React for server-side rendering benefits.
*   **PWA-First**: Fully offline-capable Progressive Web App functionality.
*   **UI System**: Utilizes Tailwind CSS and Shadcn/UI for a consistent, accessible, and responsive enterprise interface.

### Mobile App (`application`)
*   **Cross-Platform**: Built with **React Native** and **Expo** for iOS and Android.
*   **Driver-Centric**: Optimized for low-bandwidth environments, allowing drivers to view trips, navigate routes, and update status in real-time.
*   **Native Capabilities**: Leverages device features like GPS and Camera for proof-of-delivery and location tracking.

### Desktop Bridge (`tally-bridge`)
*   **Hybrid Ops**: An **Electron** + **Next.js** desktop application that bridges the gap between legacy financial software (Tally) and the cloud.
*   **Data Synchronization**: Syncs local Tally data (XML via port 9000) with the MongoDB cloud database.
*   **Resiliency**: Auto-sync scheduler with offline buffering to ensure financial data is never lost during internet outages.

## Key Features
*   **Intelligent Trip Planning**: Automated matching of vehicles to routes based on capacity and availability.
*   **Shortage & Calibration Management**: Granular tracking of fuel temperature, density, and dip-chart calibration to detect minute pilferage.
*   **Digital "GR" (Goods Receipt)**: complete digitization of the legal transport documentation.
*   **Role-Based Access Control (RBAC)**: Granular permissions for different operational divisions (Ethanol, Molasses, Petroleum).
*   **Real-time Push Notifications**: Firebase-integrated alert system for critical trip events.

## Automation & Optimization
*   **Automated Rank Indexing**: Intelligent algorithm (in `VehiclesTrip.js`) to automatically order and rank trips for a vehicle, handling historical data insertion seamlessly.
*   **Rate-Limited Batch Processing**: Backend includes custom rate limiters to throttle high-volume computations, preventing database saturation during fleet-wide updates.
*   **Dynamic Shortage Calculation**: automatically computes shortages based on loading vs. unloading metrics, factoring in allowable handling losses.

## Installation & Setup

### Prerequisites
*   Node.js v18+
*   MongoDB Instance
*   Firebase Admin Credentials

### Backend Setup
```bash
cd backend
npm install
# Configure .env with MONGODB_URI and FIREBASE_CREDENTIALS
npm run dev
```

### Frontend Setup
```bash
cd bowser-admin
npm install
# Configure .env.local
npm run dev
```

## Engineering Highlights
*   **Resilience Patterns**: The backend implements a custom `RenderCompatibleJobQueue` and `processVehicleUpdatesWithCircuitBreaker` to handle infrastructure instability gracefully. This ensures that a database glitch doesn't crash the entire API.
*   **Render-Specific Optimizations**: The architecture explicitly handles the constraints of serverless/PaaS hosting (like Render.com) by managing memory limits and execution timeouts within the application logic.
*   **Complex Aggregations**: The usage of `$facet` in MongoDB aggregations allows the system to fetch multi-dimensional dashboard data (Loaded on way, Empty standing, etc.) in a single database round-trip, significantly reducing latency.
*   **Type Safety**: Extensive use of Joi validation on the backend and Typescript interfaces on the frontend ensures data integrity across the stack.

## Future Improvements
*   **Full Accounts Management**: Deepen integration with Tally to automate financial reconciliation, reducing manual data entry for accounts teams.
*   **Automated GR & Trip Creation**: Eliminate manual intervention in Goods Receipt (GR) and Trip generation to reduce human error and operational bottlenecks.
*   **Infrastructure Cost Reduction**: Optimize resource heavy operations to lower physical infrastructure costs while scaling operations.
*   **Predictive Maintenance**: Integrate vehicle odometer and breakdown logs to forecast maintenance needs.
*   **Route Optimization AI**: Implement graph-based routing algorithms to suggest optimal paths based on historical trip data.
