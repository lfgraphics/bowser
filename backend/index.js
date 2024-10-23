const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { connectDatabases } = require('./config/database');
const logger = require('./src/middleware/logger');
const routes = require('./src/routes');
const bowserAdminAuth = require('./src/routes/bowserAdminAuth');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use(bodyParser.json());
app.use(logger);

// Routes
app.use('/', routes);
app.use('/auth/admin', bowserAdminAuth);
// Start server after database connections are established
connectDatabases()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}, reStarted at ${new Date().toLocaleString()}`);
    });
  })
  .catch(error => {
    console.error('Failed to connect to databases:', error);
    process.exit(1);
  });