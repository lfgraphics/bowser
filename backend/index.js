const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const helmet = require('helmet');
const hpp = require('hpp');
require('dotenv').config();

const { connectDatabases } = require('./config/database');
const routes = require('./src/routes');
const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(hpp());

const allowedOrigins = [
  "http://localhost:3001",
  "http://192.168.137.1:3001",
  "https://itpl-bowser-admin.vercel.app"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Middleware to filter out custom headers
app.use((req, res, next) => {
  const allowedHeaders = ['Content-Type', 'Authorization', 'Accept', 'Origin'];
  Object.keys(req.headers).forEach(header => {
    if (!allowedHeaders.includes(header)) {
      delete req.headers[header];
    }
  });
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Routes
app.use('/', routes);
// Start server after database connections are established
connectDatabases().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on the backend url, restarted at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  });
}).catch(error => {
  console.error('Failed to connect to databases:', error);
  process.exit(1);
});