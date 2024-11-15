var express = require("express");
var router = express.Router();
var Sensor = require("../models/sensor");

// POST sensor data
router.post("/", async function (req, res, next) {
  try {
    // Check if the request body is empty
    if (!req.body) {
      return res.status(400).json({ message: "Request body is empty" });
    }

    if (!req.body.bpm || !req.body.spo2) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (isNaN(req.body.bpm) || isNaN(req.body.spo2)) {
      return res.status(400).json({ message: "Invalid data type" });
    }

    console.log(req.body);

    var sensor = new Sensor(req.body);
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
