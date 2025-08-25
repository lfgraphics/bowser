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

// Start server after database connection
connectDatabases().then(() => {

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}, restarted at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  });
}).catch(error => {
  console.error('❌ Failed to connect to databases:', error);
  process.exit(1);
});
