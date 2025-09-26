const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const helmet = require('helmet');
const hpp = require('hpp');
require('dotenv').config();

const http = require("http");
// const WebSocket = require("ws");
const { connectDatabases } = require('./config/database');
const routes = require('./src/routes');

const app = express();
const server = http.createServer(app); // Shared HTTP server
// const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(hpp());

const allowedOrigins = [
  "http://localhost:3001",
  "http://192.168.88.165:3001",
  "https://itpl-bowser-admin.vercel.app"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS" + " " + origin));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Pass the WebSocket instance to the route
// const locationRoutes = require('./src/routes/locationUpdate')(wss);
// app.use('/location', locationRoutes);

// Include your main API routes
app.use('/', routes);

// Centralized error handler
// Ensures consistent error responses across the API
// Shape: { message: string, details?: any }
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  const details = process.env.NODE_ENV === 'production' ? undefined : err.stack;
  if (status >= 500) {
    console.error('Unhandled error:', err);
  }
  res.status(status).json({ message, ...(details ? { details } : {}) });
});

// Start server after database connection
connectDatabases().then(() => {

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}, restarted at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  });
}).catch(error => {
  console.error('❌ Failed to connect to databases:', error);
  process.exit(1);
});
