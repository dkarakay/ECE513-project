var express = require("express");
var router = express.Router();
var Sensor = require("../models/sensor");
var User = require("../models/user");

const jwt = require("jwt-simple");
const fs = require("fs");
const secret = fs.readFileSync(__dirname + "/../keys/jwtkey").toString();
const API_KEY = fs.readFileSync(__dirname + "/../keys/apikey").toString();

/**
 * Middleware function to check the validity of the API key in the request headers.
 * 
 * @param {Object} req - The request object.
 * @param {Object} req.headers - The headers of the request.
 * @param {string} req.headers["x-api-key"] - The API key provided in the request headers.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function in the stack.
 * 
 * @returns {Object} - Returns a 401 status with a JSON error message if the API key is missing or invalid.
 */
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

/**
 * Middleware to get user device IDs based on the request headers or body.
 * 
 * This function checks for the presence of an "x-auth" header. If the header is not present,
 * it checks the request method and retrieves the user ID from the query string (for GET requests)
 * or from the request body (for POST requests). It then fetches the user from the database and
 * attaches the user's device IDs to the request object.
 * 
 * If the "x-auth" header is present, it decodes the JWT token to get the user's email, fetches
 * the user from the database, and attaches the user's device IDs to the request object.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {void}
 */
async function getUserDeviceIds(req, res, next) {
  if (!req.headers["x-auth"]) {
    // If type is GET, check query string
    if (req.method === "GET") {
      if (req.query.userId) {
        // Get the user ID from the query string
        const userId = req.query.userId;
        const user = await User.findById(userId);
        if (!user) {
          // If user is not found, return a 404 status with an error message
          return res
            .status(404)
            .json({ success: false, msg: "User not found" });
        }
        // Attach the user's device IDs to the request object
        req.device_ids = user.devices.map((device) => device.device_id);
        return next();
            }
          }
          if (req.method === "POST") {
            if (req.body.userId) {
        // Get the user ID from the request body
        const userId = req.body.userId;
        const user = await User.findById(userId);
        if (!user) {
          // If user is not found, return a 404 status with an error message
          return res
            .status(404)
            .json({ success: false, msg: "User not found" });
        }
        // Attach the user's device IDs to the request object
        req.device_ids = user.devices.map((device) => device.device_id);
        return next();
            }
          }
          // If no user ID is found in the request, return a 401 status with an error message
          return res
            .status(401)
            .json({ success: false, msg: "Missing X-Auth header" });
        }
        const token = req.headers["x-auth"];
        try {
          // Decode the JWT token
          const decoded = jwt.decode(token, secret);
          const user = await User.findOne({ email: decoded.email });
          if (!user) {
            // If user is not found, return a 404 status with an error message
            return res.status(404).json({ success: false, msg: "User not found" });
          }
          // Attach the user's device IDs to the request object
          req.device_ids = user.devices.map((device) => device.device_id);
          next();
        } catch (ex) {
          // If there is an error decoding the JWT, return a 401 status with an error message
          res.status(401).json({ success: false, message: "Invalid JWT" });
        }
}

router.post("/", checkApiKey, async function (req, res, next) {
  try {
    // Log the request body for debugging purposes
    console.log(req.body);

    // Extract the data from the request body
    let data = req.body.data;

    // Parse data if it is a string
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (error) {
        // Log and return an error if the JSON string is invalid
        console.log("Invalid JSON string");
        return res.status(400).json({ message: "Invalid JSON string" });
      }
    }

    // Check if the request body is empty
    if (!req.body) {
      // Log and return an error if the request body is empty
      console.log("Request body is empty");
      return res.status(400).json({ message: "Request body is empty" });
    }

    // Check if the required fields are present
    if (!data.bpm || !data.spo2) {
      // Log and return an error if required fields are missing
      console.log("Missing required fields");
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if the data types are valid
    if (isNaN(data.bpm) || isNaN(data.spo2)) {
      // Log and return an error if data types are invalid
      console.log("Invalid data type");
      return res.status(400).json({ message: "Invalid data type" });
    }

    // Create a new sensor object with the request body device_id and spo2, bpm
    var sensor = new Sensor({
      device_id: req.body.device_id,
      bpm: data.bpm,
      spo2: data.spo2,
    });

    // Log the sensor object for debugging purposes
    console.log(sensor);

    // Save the sensor object to the database
    var savedSensor = await sensor.save();

    // Return the saved sensor object with a 201 status
    res.status(201).json(savedSensor);
  } catch (err) {
    // Pass any errors to the next middleware function
    next(err);
  }
});

// GET the latest sensor data for the logged-in user's devices
router.get("/latest", getUserDeviceIds, async function (req, res, next) {
  try {
    // Get the device ID from the query string
    const deviceId = req.query.device_id;
    // Create a query object based on the device ID or the user's device IDs
    const query = deviceId
      ? { device_id: deviceId }
      : { device_id: { $in: req.device_ids } };

    // Find the latest sensor data for the query
    var sensor = await Sensor.findOne(query).sort({ _id: -1 }).exec();
    // If no sensor data is found, return a 404 status with an error message
    if (!sensor) {
      return res.status(404).json({ message: "No data found" });
    }
    // Return the sensor data as a JSON response
    res.json(sensor);
  } catch (err) {
    // Pass any errors to the next middleware function
    next(err);
  }
});

// GET sensor data showing all entries for the logged-in user's devices
router.get("/", getUserDeviceIds, async function (req, res, next) {
  try {
    // Get the device ID from the query string
    const deviceId = req.query.device_id;
    // Create a query object based on the device ID or the user's device IDs
    const query = deviceId
      ? { device_id: deviceId }
      : { device_id: { $in: req.device_ids } };

    // Find all sensor data for the query
    var sensor = await Sensor.find(query).exec();
    // If no sensor data is found, return a 404 status with an error message
    if (!sensor) {
      return res.status(404).json({ message: "No data found" });
    }
    // Return the sensor data as a JSON response
    res.json(sensor);
  } catch (err) {
    // Pass any errors to the next middleware function
    next(err);
  }
});

// GET all sensor data (for debug purposes)
router.get("/all", async function (req, res, next) {
  try {
    // Find all sensor data in the database
    var sensor = await Sensor.find().exec();
    // Return the sensor data with a 200 status
    res.status(200).json(sensor);
  } catch (err) {
    // Pass any errors to the next middleware function
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


// Delete sensor data by sensor ID
router.delete("/:id", async function (req, res, next) {
  try {
    var sensor = await Sensor.findByIdAndDelete(req.params.id).exec();
    if (!sensor) {
      return res.status(404).json({ message: "No data found" });
    }
    res.json(sensor);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

