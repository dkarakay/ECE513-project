var express = require("express");
var router = express.Router();
var Sensor = require("../models/sensor");
var User = require("../models/user");

const jwt = require("jwt-simple");
const fs = require("fs");
const secret = fs.readFileSync(__dirname + "/../keys/jwtkey").toString();

// Middleware to get the logged-in user's device ID
async function getUserDeviceId(req, res, next) {
  console.log(req.headers);
  if (!req.headers["x-auth"]) {
    console.log("Missing X-Auth header");
    return res
      .status(401)
      .json({ success: false, msg: "Missing X-Auth header" });
  }
  const token = req.headers["x-auth"];
  console.log("Token:", token);
  try {
    const decoded = jwt.decode(token, secret);
    const user = await User.findOne({ email: decoded.email }, "device_id");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    req.device_id = user.device_id;
    next();
  } catch (ex) {
    res.status(401).json({ success: false, message: "Invalid JWT" });
  }
}

// POST sensor data
router.post("/", async function (req, res, next) {
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

// GET sensor data showing the latest entry for the logged-in user
router.get("/latest", getUserDeviceId, async function (req, res, next) {
  try {
    var sensor = await Sensor.findOne({ device_id: req.device_id })
      .sort({ _id: -1 })
      .exec();
    // If it is null, say that the user has no data
    if (!sensor) {
      return res.json({ message: "No data found" });
    }
    res.json(sensor);
  } catch (err) {
    next(err);
  }
});

// GET sensor data showing all entries for the logged-in user
router.get("/", getUserDeviceId, async function (req, res, next) {
  try {
    var sensor = await Sensor.find({ device_id: req.device_id }).exec();
    // If it is null, say that the user has no data
    if (!sensor) {
      return res.json({ message: "No data found" });
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
    res.json(sensor);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
