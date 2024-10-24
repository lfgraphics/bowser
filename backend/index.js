const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { connectDatabases } = require('./config/database');
const routes = require('./src/routes');
const bowserAdminAuth = require('./src/routes/bowserAdminAuth');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/', routes);
app.use('/auth/admin', bowserAdminAuth);
// Start server after database connections are established
connectDatabases()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on https://bowser-backend-2cdr.onrender.com, restarted at ${new Date().toLocaleString()}`);
    });
  })
  .catch(error => {
    console.error('Failed to connect to databases:', error);
    process.exit(1);
  });