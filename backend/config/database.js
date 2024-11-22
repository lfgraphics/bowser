const mongoose = require('mongoose');

const bowsersDatabaseConnection = mongoose.createConnection(process.env.BowsersDataConnectionString, {
    serverSelectionTimeoutMS: 35000
});

const transportDatabaseConnection = mongoose.createConnection(process.env.TransportDataConnectionString, {
    serverSelectionTimeoutMS: 35000
});
const UsersAndRolesDatabaseConnection = mongoose.createConnection(process.env.UsersAndRolesDataConnectionString, {
    serverSelectionTimeoutMS: 35000
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
    connectDatabases
};