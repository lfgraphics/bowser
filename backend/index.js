import express, { json, urlencoded } from 'express';
import cors from 'cors';
import bodyParserPkg from 'body-parser';
const { json: _json } = bodyParserPkg;
import cookieParser from "cookie-parser";
import helmet from 'helmet';
import hpp from 'hpp';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

import { createServer } from "http";
// const WebSocket = require("ws");
import { connectDatabases } from './config/database.js';
import routes from './src/routes/index.js';
import { requestContext, errorHandler } from './src/middleware/errorHandler.js';

const app = express();
const server = createServer(app); // Shared HTTP server
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

app.use(json({ limit: '10mb' }));
app.use(urlencoded({ limit: '10mb', extended: true }));
app.use(_json());
app.use(cookieParser());

// Attach request context for correlation
app.use(requestContext);

// Pass the WebSocket instance to the route
// const locationRoutes = require('./src/routes/locationUpdate')(wss);
// app.use('/location', locationRoutes);

// Include your main API routes
app.use('/', routes);

// Centralized error handler (must be after routes)
app.use(errorHandler);

// Start server after database connection
connectDatabases().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}, restarted at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  });
}).catch(error => {
  console.error('❌ Failed to connect to databases:', error);
  process.exit(1);
});
