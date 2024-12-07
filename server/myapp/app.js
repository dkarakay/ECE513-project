// app.js

var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const db = require("./db");

const bodyParser = require("body-parser");
const cors = require("cors"); // Recommended to use the cors package for better management

// Import Routes
var graphRouter = require("./routes/graph");
var usersRouter = require("./routes/users");
var sensorRouter = require("./routes/sensor");
var physiciansRouter = require("./routes/physicians"); // New Physician Routes

var app = express();

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// Middleware Configuration

// Use CORS package for handling Cross-Origin requests
app.use(cors({
  origin: "*", // Update this to restrict origins in production
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true
}));

// Body Parsers
app.use(express.json()); // Built-in body parser for JSON
app.use(express.urlencoded({ extended: false })); // Built-in body parser for URL-encoded data

// Logger and Cookie Parser
app.use(logger("dev"));
app.use(cookieParser());

// Static Files
app.use(express.static(path.join(__dirname, "public")));

// Route Handlers
app.use("/graph", graphRouter);
app.use("/users", usersRouter);
app.use("/sensor", sensorRouter);
app.use("/physicians", physiciansRouter); // Mount Physician Routes

// Serve index.html for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Reset Database
app.get("/reset", async (req, res) => {
  console.log("Resetting database");
  try {
    await db.connection.dropDatabase();
    res.send("Database reset");
  } catch (err) {
    console.error("Error resetting database:", err);
    res.status(500).send("Error resetting database");
  }
});

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error Handler
app.use(function (err, req, res, next) {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // Respond with JSON for API routes or render error page for others
  if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/physicians")) {
    res.status(err.status || 500).json({
      message: err.message,
      error: res.locals.error
    });
  } else {
    res.status(err.status || 500);
    res.render("error");
  }
});

module.exports = app;
