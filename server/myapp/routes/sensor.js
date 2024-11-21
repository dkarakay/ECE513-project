var express = require("express");
var router = express.Router();
var Sensor = require("../models/sensor");

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

// GET sensor data showing the latest entry
router.get("/latest", async function (req, res, next) {
  try {
    var sensor = await Sensor.findOne().sort({ _id: -1 }).exec();
    res.json(sensor);
  } catch (err) {
    next(err);
  }
});

// GET sensor data showing all entries
router.get("/", async function (req, res, next) {
  try {
    var sensor = await Sensor.find().exec();
    res.json(sensor);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
