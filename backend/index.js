const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
require('dotenv').config();

const { connectDatabases } = require('./config/database');
const routes = require('./src/routes');
const bowserAdminAuth = require('./src/routes/bowserAdminAuth');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  "http://localhost:3001",
  "http://192.168.137.1:3001",
  "https://itpl-bowser-admin.vercel.app"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like Postman or server-side requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Enable credentials
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Routes
app.use('/', routes);
app.use('/auth/admin', bowserAdminAuth);
// Start server after database connections are established
connectDatabases()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on the backend url, restarted at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    });
  })
  .catch(error => {
    console.error('Failed to connect to databases:', error);
    process.exit(1);
  });