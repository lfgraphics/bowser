const mongoose = require('mongoose');

const bowsersDatabaseConnection = mongoose.createConnection(process.env.BowsersDataConnectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 35000
});

const transportDatabaseConnection = mongoose.createConnection(process.env.TransportDataConnectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 35000
});

async function connectDatabases() {
    return Promise.all([
        new Promise(resolve => bowsersDatabaseConnection.once('connected', resolve)),
        new Promise(resolve => transportDatabaseConnection.once('connected', resolve))
    ]).then(() => {
        console.log('Both database connections established');
    });
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

module.exports = {
    bowsersDatabaseConnection,
    transportDatabaseConnection,
    connectDatabases
};