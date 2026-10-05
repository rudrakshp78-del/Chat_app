const express = require("express");
const routes = require("./routes");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const bodyparser = require("body-parser");
const cors = require("cors");

const app = express();

app.disable("x-powered-by");

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(bodyparser.json({ limit: "50mb" }));
app.use(bodyparser.urlencoded({ extended: true, limit: "50mb" }));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const apiLimiter = rateLimit({
  max: 3000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour.",
});

const authLimiter = rateLimit({
  max: 60,
  windowMs: 15 * 60 * 1000,
  message: "Too many authentication attempts, please try again in 15 minutes.",
});

app.use("/auth", authLimiter);
app.use("/", apiLimiter);

app.use(routes);

module.exports = app;