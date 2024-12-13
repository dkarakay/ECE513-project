var express = require("express");
var router = express.Router();
var Sensor = require("../models/sensor");
var User = require("../models/user");

const jwt = require("jwt-simple");
const fs = require("fs");
const secret = fs.readFileSync(__dirname + "/../keys/jwtkey").toString();
const API_KEY = fs.readFileSync(__dirname + "/../keys/apikey").toString();

// Middleware to check for API key
function checkApiKey(req, res, next) {
  var apiKey = req.headers["x-api-key"];
  // String trimming
  apiKey = apiKey.trim();

  if (!apiKey) {
    return res.status(401).json({ success: false, msg: "Missing API key" });
  }
  if (apiKey !== API_KEY) {
    return res.status(401).json({ success: false, msg: "Invalid API key" });
  }
  next();
}

// Middleware to get the logged-in user's device IDs
async function getUserDeviceIds(req, res, next) {
  if (!req.headers["x-auth"]) {
    // If type is GET, check query string
    if (req.method === "GET") {
      if (req.query.userId) {
        // Get the user ID from the query string
        const userId = req.query.userId;
        const user = await User.findById(userId);
        if (!user) {
          return res
            .status(404)
            .json({ success: false, msg: "User not found" });
        }
        req.device_ids = user.devices.map((device) => device.device_id);
        return next();
      }
    }
    if (req.method === "POST") {
      if (req.body.userId) {
        const userId = req.body.userId;
        const user = await User.findById(userId);
        if (!user) {
          return res
            .status(404)
            .json({ success: false, msg: "User not found" });
        }

        req.device_ids = user.devices.map((device) => device.device_id);
        return next();
      }
    }

    return res
      .status(401)
      .json({ success: false, msg: "Missing X-Auth header" });
  }
  const token = req.headers["x-auth"];
  try {
    // Decode the JWT
    const decoded = jwt.decode(token, secret);
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    // Get the device IDs of the user
    req.device_ids = user.devices.map((device) => device.device_id);
    next();
  } catch (ex) {
    res.status(401).json({ success: false, message: "Invalid JWT" });
  }
}

// POST sensor data
router.post("/", checkApiKey, async function (req, res, next) {
  try {
    console.log(req.body);

    let data = req.body.data;

    // Parse data if it is a string
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (error) {
        console.log("Invalid JSON string");
        return res.status(400).json({ message: "Invalid JSON string" });
      }
    }

    // Check if the request body is empty
    if (!req.body) {
      console.log("Request body is empty");
      return res.status(400).json({ message: "Request body is empty" });
    }

    if (!data.bpm || !data.spo2) {
      console.log("Missing required fields");
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (isNaN(data.bpm) || isNaN(data.spo2)) {
      console.log("Invalid data type");
      return res.status(400).json({ message: "Invalid data type" });
    }

    // Create a new sensor object with the request body device_id and spo2, bpm

    var sensor = new Sensor({
      device_id: req.body.device_id,
      bpm: data.bpm,
      spo2: data.spo2,
    });

    console.log(sensor);

    var savedSensor = await sensor.save();

    res.status(201).json(savedSensor);
  } catch (err) {
    next(err);
  }
});
// GET sensor data showing the latest entry for the logged-in user's devices
router.get("/latest", getUserDeviceIds, async function (req, res, next) {
  try {
    const deviceId = req.query.device_id;
    const query = deviceId
      ? { device_id: deviceId }
      : { device_id: { $in: req.device_ids } };

    var sensor = await Sensor.findOne(query).sort({ _id: -1 }).exec();
    // If it is null, say that the user has no data
    if (!sensor) {
      return res.status(404).json({ message: "No data found" });
    }
    res.json(sensor);
  } catch (err) {
    next(err);
  }
});

// GET sensor data showing all entries for the logged-in user's devices
router.get("/", getUserDeviceIds, async function (req, res, next) {
  try {
    const deviceId = req.query.device_id;
    const query = deviceId
      ? { device_id: deviceId }
      : { device_id: { $in: req.device_ids } };

    var sensor = await Sensor.find(query).exec();
    // If it is null, say that the user has no data
    if (!sensor) {
      return res.status(404).json({ message: "No data found" });
    }
    res.json(sensor);
  } catch (err) {
    next(err);
  }
});

// GET all sensor data (for debug purposes)
router.get("/all", async function (req, res, next) {
  try {
    var sensor = await Sensor.find().exec();
    res.status(200).json(sensor);
  } catch (err) {
    next(err);
  }
});

// Get sensor data by device_id
router.get("/device/:device_id", async function (req, res, next) {
  try {
    var sensor = await Sensor.find({ device_id: req.params.device_id }).exec();
    if (!sensor) {
      return res.status(404).json({ message: "No data found" });
    }
    res.json(sensor);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
