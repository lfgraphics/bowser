import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Initialize connection variables
let bowsersDatabaseConnection;
let transportDatabaseConnection;
let UsersAndRolesDatabaseConnection;

// Function to create connections after env vars are loaded
function createConnections() {
    let needsEventListeners = false;

    if (!bowsersDatabaseConnection) {
        if (!process.env.BowsersDataConnectionString) {
            throw new Error('BowsersDataConnectionString environment variable is not set');
        }
        bowsersDatabaseConnection = mongoose.createConnection(process.env.BowsersDataConnectionString, {
            serverSelectionTimeoutMS: 35000,
            // Transactions require replica set; leave pool sizes reasonable
            minPoolSize: 5,
            maxPoolSize: 50,
        });
        needsEventListeners = true;
    }

    if (!transportDatabaseConnection) {
        if (!process.env.TransportDataConnectionString) {
            throw new Error('TransportDataConnectionString environment variable is not set');
        }
        transportDatabaseConnection = mongoose.createConnection(process.env.TransportDataConnectionString, {
            serverSelectionTimeoutMS: 35000,
            minPoolSize: 5,
            maxPoolSize: 50,
        });
        needsEventListeners = true;
    }

    if (!UsersAndRolesDatabaseConnection) {
        if (!process.env.UsersAndRolesDataConnectionString) {
            throw new Error('UsersAndRolesDataConnectionString environment variable is not set');
        }
        UsersAndRolesDatabaseConnection = mongoose.createConnection(process.env.UsersAndRolesDataConnectionString, {
            serverSelectionTimeoutMS: 35000,
            minPoolSize: 5,
            maxPoolSize: 50,
        });
        needsEventListeners = true;
    }

    // Setup event listeners only if new connections were created
    if (needsEventListeners) {
        setupEventListeners();
    }

    return {
        bowsersDatabaseConnection,
        transportDatabaseConnection,
        UsersAndRolesDatabaseConnection
    };
}

async function connectDatabases() {
    try {
        // Create connections first
        const connections = createConnections();

        await Promise.all([
            new Promise((resolve, reject) => {
                connections.bowsersDatabaseConnection.once('connected', resolve);
                connections.bowsersDatabaseConnection.once('error', reject);
            }),
            new Promise((resolve, reject) => {
                connections.transportDatabaseConnection.once('connected', resolve);
                connections.transportDatabaseConnection.once('error', reject);
            }),
            new Promise((resolve, reject) => {
                connections.UsersAndRolesDatabaseConnection.once('connected', resolve);
                connections.UsersAndRolesDatabaseConnection.once('error', reject);
            })
        ]);
        console.log('All database connections established');
    } catch (error) {
        console.error('Failed to connect to one or more databases:', error);
        throw error; // or handle it as appropriate for your application
    }
}

/**
 * Connection health checks ensuring sessions/transactions are supported.
 */
async function isHealthy(conn) {
    try {
        // quick round-trip to topology
        await conn.db.admin().command({ ping: 1 });
        return true;
    } catch (e) {
        return false;
    }
}

// Getter functions for connections
function getBowsersDatabaseConnection() {
    if (!bowsersDatabaseConnection) {
        createConnections();
    }
    return bowsersDatabaseConnection;
}

function getTransportDatabaseConnection() {
    if (!transportDatabaseConnection) {
        createConnections();
    }
    return transportDatabaseConnection;
}

function getUsersAndRolesDatabaseConnection() {
    if (!UsersAndRolesDatabaseConnection) {
        createConnections();
    }
    return UsersAndRolesDatabaseConnection;
}

/**
 * Acquire a session from the specified connection
 * @param {'bowsers'|'transport'|'users'} key
 */
function getSessionForConnection(key) {
    switch (key) {
        case 'bowsers':
            return getBowsersDatabaseConnection().startSession();
        case 'transport':
            return getTransportDatabaseConnection().startSession();
        case 'users':
            return getUsersAndRolesDatabaseConnection().startSession();
        default:
            throw new Error(`Unknown connection key: ${key}`);
    }
}

// Setup event listeners when connections are created
function setupEventListeners() {
    if (bowsersDatabaseConnection) {
        bowsersDatabaseConnection.on('connected', () => {
            console.log('Connected to BowsersData MongoDB');
        });
        bowsersDatabaseConnection.on('error', (error) => {
            console.error('BowsersData MongoDB connection error:', error);
        });
    }

    if (transportDatabaseConnection) {
        transportDatabaseConnection.on('connected', () => {
            console.log('Connected to TransportDataHn MongoDB');
        });
        transportDatabaseConnection.on('error', (error) => {
            console.error('TransportDataHn MongoDB connection error:', error);
        });
    }

    if (UsersAndRolesDatabaseConnection) {
        UsersAndRolesDatabaseConnection.on('connected', () => {
            console.log('Connected to UsersAndRoles MongoDB');
        });
        UsersAndRolesDatabaseConnection.on('error', (error) => {
            console.error('UsersAndRoles MongoDB connection error:', error);
        });
    }
}

export {
    getBowsersDatabaseConnection,
    getTransportDatabaseConnection,
    getUsersAndRolesDatabaseConnection,
    getBowsersDatabaseConnection as bowsersDatabaseConnection,
    getTransportDatabaseConnection as transportDatabaseConnection,
    getUsersAndRolesDatabaseConnection as UsersAndRolesDatabaseConnection,
    connectDatabases,
    isHealthy,
    getSessionForConnection,
};