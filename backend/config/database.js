const mongoose = require('mongoose');

const bowsersDatabaseConnection = mongoose.createConnection(process.env.BowsersDataConnectionString, {
    serverSelectionTimeoutMS: 35000,
    // Transactions require replica set; leave pool sizes reasonable
    minPoolSize: 5,
    maxPoolSize: 50,
});

const transportDatabaseConnection = mongoose.createConnection(process.env.TransportDataConnectionString, {
    serverSelectionTimeoutMS: 35000,
    minPoolSize: 5,
    maxPoolSize: 50,
});
const UsersAndRolesDatabaseConnection = mongoose.createConnection(process.env.UsersAndRolesDataConnectionString, {
    serverSelectionTimeoutMS: 35000,
    minPoolSize: 5,
    maxPoolSize: 50,
});

async function connectDatabases() {
    try {
        await Promise.all([
            new Promise((resolve, reject) => {
                bowsersDatabaseConnection.once('connected', resolve);
                bowsersDatabaseConnection.once('error', reject);
            }),
            new Promise((resolve, reject) => {
                transportDatabaseConnection.once('connected', resolve);
                transportDatabaseConnection.once('error', reject);
            }),
            new Promise((resolve, reject) => {
                UsersAndRolesDatabaseConnection.once('connected', resolve);
                UsersAndRolesDatabaseConnection.once('error', reject);
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

/**
 * Acquire a session from the specified connection
 * @param {'bowsers'|'transport'|'users'} key
 */
function getSessionForConnection(key) {
    switch (key) {
        case 'bowsers':
            return bowsersDatabaseConnection.startSession();
        case 'transport':
            return transportDatabaseConnection.startSession();
        case 'users':
            return UsersAndRolesDatabaseConnection.startSession();
        default:
            throw new Error(`Unknown connection key: ${key}`);
    }
}

bowsersDatabaseConnection.on('connected', () => {
    console.log('Connected to BowsersData MongoDB');
});

bowsersDatabaseConnection.on('error', (error) => {
    console.error('BowsersData MongoDB connection error:', error);
});

transportDatabaseConnection.on('connected', () => {
    console.log('Connected to TransportDataHn MongoDB');
});

transportDatabaseConnection.on('error', (error) => {
    console.error('TransportDataHn MongoDB connection error:', error);
});

UsersAndRolesDatabaseConnection.on('connected', () => {
    console.log('Connected to UsersAndRoles MongoDB');
});

UsersAndRolesDatabaseConnection.on('error', (error) => {
    console.error('UsersAndRoles MongoDB connection error:', error);
});

module.exports = {
    bowsersDatabaseConnection,
    transportDatabaseConnection,
    UsersAndRolesDatabaseConnection,
    connectDatabases,
    isHealthy,
    getSessionForConnection,
};