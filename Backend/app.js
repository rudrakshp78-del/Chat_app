const express = require ("express");  // web framework for node.js

const routes = require("./routes");

const morgan = require("morgan");  // http request logger middleware for node.js

const rateLimit = require("express-rate-limit");

const helmet = require("helmet");  // 

const bodyparser = require("body-parser");

const  xss = require("xss");

const cors = require("cors");

const app = express();

  app.use(express.urlencoded({
    extended: true,
  }))


//   app.use(xss());

//

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    credentials: true,
}));

app.use(express.json({ limit: "10kb"}));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: true}));

app.use(helmet());

if (process.env.NODE_ENV === "development") {
   app.use(morgan("dev"));
}

const limiter = rateLimit({
    max: 3000,
    windowMs: 60 * 60 * 1000, // in one hour 
    message: "Too many request from this Ip , please try again in hour",
  })

  app.use("/tawk", limiter);



  app.use(routes);

module.exports = app;


// https://localhost:5000/v1/auth/login->