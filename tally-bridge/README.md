# Tally Bridge - Desktop Application

A modern Electron desktop application that bridges local Tally data with cloud MongoDB databases. Built with Electron, Next.js 15.5, and Tailwind CSS 4.1.x for a modern, responsive user interface.

## Overview

Tally Bridge is a desktop application designed to facilitate seamless data synchronization between local Tally software and cloud MongoDB instances. It provides real-time monitoring, scheduled sync operations, and comprehensive logging for data transfer operations.

## Tech Stack

- **Framework**: Electron 35.x (Desktop Application)
- **UI**: Next.js 15.5 with App Router (Modern React Framework)
- **Styling**: Tailwind CSS 4.1.x (Utility-First CSS Framework)
- **Backend**: Node.js with Express (API Server)
- **Database**: MongoDB (Local and Atlas Cloud)
- **Language**: TypeScript + JavaScript (ES Modules)
- **Icons**: Lucide React (Modern Icon Library)

## Features

### Core Functionality
- **Tally Status Checking**: Real-time connection status with Tally software
- **XML Forwarding**: Seamless data forwarding to Tally (port 9000)
- **Bridge Server**: Express server running on port 4000 for API operations
- **MongoDB Sync**: Bidirectional synchronization between local MongoDB and Atlas
- **Auto-sync Scheduler**: Configurable automatic sync operations (9 AM - 11 PM window)
- **Manual Sync Trigger**: On-demand synchronization capabilities
- **Comprehensive Logging**: Real-time logging with multiple severity levels
- **Auto-updater**: Automatic application updates via GitHub releases

### User Interface
- **Modern Design**: Clean, dark-themed interface built with Tailwind CSS
- **Responsive Layout**: Adaptive design that works across different screen sizes
- **Real-time Updates**: Live log streaming and status updates
- **Interactive Controls**: Intuitive buttons and modals for all operations
- **Accessibility**: Keyboard navigation and screen reader support

## Prerequisites

Before running Tally Bridge, ensure you have:

- **Node.js**: Version 22.x or higher
- **MongoDB**: Local MongoDB instance running (for sync functionality)
- **Tally Software**: Running on localhost:9000 (for Tally integration)
- **Git**: For cloning the repository

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/lfgraphics/bowser.git
   cd bowser/tally-bridge
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   Create a `.env` file in the root directory with your MongoDB URIs:
   ```env
   localUri=mongodb://192.168.165.72:27017
   atlasUri=mongodb+srv://your-atlas-connection-string
   ```

## Development

### Running in Development Mode

Start both Next.js dev server and Electron with hot reload:

```bash
npm start
```

Alternatively, you can run them separately (the Next.js dev server listens on a dynamic port and Electron will read ELECTRON_NEXT_PORT):

```bash
# Terminal 1: Start Next.js dev server (uses ELECTRON_NEXT_PORT if set, else 3000)
set ELECTRON_NEXT_PORT=3055 && npm run dev:next  # Windows PowerShell: $env:ELECTRON_NEXT_PORT=3055; npm run dev:next

# Terminal 2: Start Electron (after Next.js is ready)
npm run dev:electron
```

Port coordination:
- dev-runner automatically chooses an open port in 3000-3100 and exports ELECTRON_NEXT_PORT
- you can manually override by setting ELECTRON_NEXT_PORT before starting Next.js

### Development Features
- **Hot Reload**: Next.js provides instant refresh for UI changes
- **Development Tools**: Electron DevTools and React Developer Tools available
- **Colored Logging**: Distinguished output for Next.js and Electron processes
- **Error Handling**: Comprehensive error reporting during development

## Building

### Build for Production

```bash
npm run build
```

This command:
1. Builds the Next.js application in standalone mode
2. Packages the Electron application using electron-builder
3. Creates a portable executable in the `dist/` directory

### Build Steps
- **Next.js Build**: Optimizes React components and creates standalone server
- **Electron Packaging**: Bundles all dependencies and creates distributable
- **Asset Optimization**: Compresses and optimizes all static assets

## Architecture

### Application Structure

```
┌─────────────────────┐
│   Electron Main     │
│    (main.js)        │
├─────────────────────┤
│   Next.js Server    │
│  (Standalone Mode)  │
├─────────────────────┤
│   Express Bridge    │
│   (Port 4000)       │
├─────────────────────┤
│   MongoDB Sync      │
│ (Local ↔ Atlas)     │
└─────────────────────┘
```

### Communication Flow

1. **Renderer Process** (Next.js UI) communicates with **Main Process** via IPC
2. **Preload Script** provides secure bridge with TypeScript definitions
3. **Main Process** manages all backend operations (sync, Tally, logging)
4. **Express Server** handles Tally XML forwarding independently

### Security Model
- **Context Isolation**: Enabled for security (`contextIsolation: true`)
- **No Node Integration**: Renderer process has no direct Node.js access
- **Preload Script**: Secure API bridge with input validation
- **Type Safety**: Full TypeScript support for IPC communication

## Configuration

### Environment Variables

**Development** (`.env`):
```env
localUri=mongodb://localhost:27017
atlasUri=mongodb+srv://username:password@cluster.mongodb.net/database
```

**Production** (`env.production`):
- Included in application bundle
- Editable via the UI settings
- Automatically loaded by the application

### Port Configuration
- **Next.js Dev**: Port 3000 (development only)
- **Next.js Prod**: Dynamic port allocation (3000-3100 range)
- **Bridge Server**: Port 4000 (fixed)
- **Tally Integration**: Port 9000 (external dependency)

## Sync Operations

### Supported Collections
- **Drivers Data**: Driver information and credentials
- **Vehicles Data**: Vehicle specifications and status
- **Attached Vehicles**: Vehicle-driver associations
- **Trip Data**: Individual trip records
- **Trips**: Consolidated trip information
- **Transport Goods**: Goods and cargo information
- **Stakeholders**: Business stakeholders data

### Sync Scheduling
- **Auto-sync Window**: 9 AM to 11 PM daily
- **Configurable Interval**: Minimum 10 minutes, maximum 24 hours
- **Manual Override**: Available at any time
- **Error Handling**: Automatic retry with exponential backoff

## Troubleshooting

### Common Issues

**Tally Connection Problems**:
- Ensure Tally software is running on localhost:9000
- Check if Tally has XML forwarding enabled
- Verify network connectivity and firewall settings

**MongoDB Sync Issues**:
- Validate MongoDB connection strings in configuration
- Ensure local MongoDB service is running
- Check Atlas cluster connectivity and credentials
- Review sync logs for specific error messages

**Build Issues**:
- Clear `.next` directory and rebuild: `rm -rf .next && npm run build:next`
- Verify all dependencies are installed: `npm install`
- Check Node.js version compatibility (22.x+)

**Application Startup Problems**:
- Check if ports 3000 and 4000 are available
- Review console output for specific error messages
- Ensure all environment variables are configured

### Debug Mode

Enable verbose logging by setting environment variable:
```bash
DEBUG=* npm start
```

## Publishing

### Creating Releases

1. **Update version** in `package.json`
2. **Commit changes** to the main branch
3. **Create Git tag**: `git tag v2.4.0`
4. **Push tag**: `git push origin v2.4.0`
5. **Build release**: `npm run build`
6. **Upload to GitHub**: Automatic via electron-builder

### Auto-updater
- Checks for updates every 10 minutes
- Downloads updates in the background
- Prompts user to restart when ready
- Integrates with GitHub Releases

## CLI Usage

Run manual sync operations from command line:

```bash
# Run a one-time sync operation
npm run sync

# Check sync status
node cli/syncRunner.js --status
```

## API Endpoints

The bridge server exposes several endpoints:

- `GET /health` - Health check
- `POST /tally/status` - Check Tally connection
- `POST /sync/manual` - Trigger manual sync
- `GET /sync/logs` - Retrieve sync logs

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with proper TypeScript types
4. Test thoroughly in both development and production modes
5. Submit a pull request with detailed description

## License

ISC License - see LICENSE file for details

## Author

**Taha Kazmi** - Lead Developer
- Email: [Contact Information]
- GitHub: [@lfgraphics](https://github.com/lfgraphics)

## Support

For technical support or feature requests:
1. Check the troubleshooting section above
2. Review existing GitHub issues
3. Create a new issue with detailed information
4. Contact the development team

---

*Built with ❤️ for seamless data integration*