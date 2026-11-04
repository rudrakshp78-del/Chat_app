const express = require("express");
const routes = require("./routes");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

const app = express();

app.disable("x-powered-by");

// 1. Security HTTP Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

// 2. CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5000",
  "http://127.0.0.1:3000",
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile apps, native wrappers, curl, server-to-server (where origin is not sent)
      if (!origin || origin === "null") {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin) || origin.endsWith(".netlify.app")) {
        return callback(null, true);
      }
      if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
        return callback(null, true);
      }
      // In development, allow all
      if (process.env.NODE_ENV === "development") {
        return callback(null, true);
      }
      callback(null, true);
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    credentials: true,
  })
);

// 3. Body parsers with size limit
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 4. Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// 5. Data sanitization against XSS (Cross-Site Scripting)
app.use(xss());

// 6. Request logging in development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// 7. Rate limiting to prevent Brute-Force and DoS attacks
const apiLimiter = rateLimit({
  max: 3000,
  windowMs: 60 * 60 * 1000,
  message: {
    status: "error",
    message: "Too many requests from this IP, please try again in an hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  max: 60,
  windowMs: 15 * 60 * 1000,
  message: {
    status: "error",
    message: "Too many authentication attempts, please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/auth", authLimiter);
app.use("/", apiLimiter);

// 8. Mount application routes
app.use(routes);

// 9. 404 handler for undefined routes (Express 5 compatible)
app.use((req, res, next) => {
  res.status(404).json({
    status: "error",
    message: `Cannot find ${req.originalUrl} on this server`,
  });
});

// 10. Global Error Handler - returns clean JSON without exposing stack traces in production
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    console.error("Global Error Handler:", err);
  } else {
    console.error("Global Error:", err?.message || err);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    status: err.status || "error",
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
});

module.exports = app;
