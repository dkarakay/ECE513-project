var express = require("express");
var router = express.Router();
var Physician = require("../models/physician");
var User = require("../models/user");
var Sensor = require("../models/sensor");

const jwt = require("jwt-simple");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const secret = fs.readFileSync(__dirname + "/../keys/jwtkey").toString();

/**
 * Middleware to get the physician ID from the JWT token in the request headers.
 * 
 * @param {Object} req - The request object.
 * @param {Object} req.headers - The headers of the request.
 * @param {string} req.headers["x-auth"] - The JWT token.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * 
 * @returns {Object} - Returns a 401 status with a message if the "x-auth" header is missing or the JWT is invalid.
 *                     Returns a 404 status with a message if the physician is not found.
 *                     Calls the next middleware function if the physician is found and sets req.physicianId.
 */
async function getPhysicianId(req, res, next) {
  console.log(req.headers);
  if (!req.headers["x-auth"]) {
    console.log("Missing X-Auth header");
    return res
      .status(401)
      .json({ success: false, msg: "Missing X-Auth header" });
  }
  const token = req.headers["x-auth"];
  try {
    const decoded = jwt.decode(token, secret);
    const physician = await Physician.findOne({ email: decoded.email });
    if (!physician) {
      return res
        .status(404)
        .json({ success: false, msg: "Physician not found" });
    }
    req.physicianId = physician._id;
    next();
  } catch (ex) {
    res.status(401).json({ success: false, message: "Invalid JWT" });
  }
}


router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required." });
  }

  try {
    // Check if physician already exists
    const existingPhysician = await Physician.findOne({ email });
    if (existingPhysician) {
      return res
        .status(409)
        .json({ success: false, message: "Physician already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new physician
    const newPhysician = new Physician({
      email,
      password: hashedPassword,
    });

    await newPhysician.save();

    console.log(`Physician registered: ${email}`);

    res
      .status(201)
      .json({ success: true, message: "Physician registered successfully." });
  } catch (error) {
    console.error("Error during physician registration:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Physician Login Endpoint
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required." });
  }

  try {
    // Find physician by email
    const physician = await Physician.findOne({ email });
    if (!physician) {
      return res
        .status(404)
        .json({ success: false, message: "Physician not found." });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, physician.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    // Generate JWT
    const payload = { email: physician.email, id: physician._id };
    const token = jwt.encode(payload, secret);

    // Update physician's last access time
    physician.lastAccess = new Date();
    await physician.save();

    console.log(`Physician logged in: ${email}`);

    res.json({ success: true, token });
  } catch (error) {
    console.error("Error during physician login:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Fetch All Patients for Physician
router.get("/patients", getPhysicianId, async (req, res) => {
  const physicianId = req.query.physicianId || req.physicianId;
  if (!physicianId) {
    return res
      .status(400)
      .json({ success: false, message: "Physician ID is required." });
  }

  try {
    // Fetch all patients for the physician
    const physician = await Physician.findById(physicianId).populate(
      "patients"
    );

    // Check if the physician exists
    if (!physician) {
      return res
      .status(404)
      .json({ success: false, message: "Physician not found." });
    }

    // Fetch patients and their stats
    const patientsWithStats = await Promise.all(
      physician.patients.map(async (patientId) => {
      // Find the patient by ID
      const user = await User.findById(patientId);

      // If the user is not found, return null
      if (!user) {
        return null;
      }

      // Calculate the date range for the last 7 days
      const now = new Date();
      const sevenDaysAgo = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 7
      );

      // Query to find sensor data for the user's devices in the last 7 days
      const query = {
        device_id: { $in: user.devices.map((device) => device.device_id) },
        createdAt: { $gte: sevenDaysAgo },
      };
      const devices = user.devices.map((device) => device.device_id);
      const sensors = await Sensor.find(query).exec();

      // Calculate BPM statistics
      const bpms = sensors.map((sensor) => sensor.bpm);
      const averageBpm =
        bpms.reduce((sum, bpm) => sum + bpm, 0) / bpms.length;
      const maxBpm = Math.max(...bpms);
      const minBpm = Math.min(...bpms);

      // Log patient summary
      console.log("Patient summary:", {
        name: user.email,
        avg_hr: averageBpm,
        min_hr: minBpm,
        max_hr: maxBpm,
        devices: devices,
        measurement_frequency: user.measurementFrequency || 30,
      });

      // Return patient data with stats
      return {
        ...user.toObject(),
        stats: {
        averageBpm,
        maxBpm,
        minBpm,
        },
        devices,
      };
      })
    );

    res.json({ success: true, patients: patientsWithStats.filter(Boolean) });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Return all registered physicians (for admin)
router.get("/", async (req, res) => {
  try {
    // Fetch all physicians
    const physicians = await Physician.find({}, { password: 0 });

    res.json({ success: true, physicians });
  } catch (error) {
    console.error("Error fetching physicians:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Return a specific physician by ID
router.get("/:id", async (req, res) => {
  try {
    const physician = await Physician.findById(req.params.id, { password: 0 });
    if (!physician) {
      return res
        .status(404)
        .json({ success: false, message: "Physician not found." });
    }
    res.json({ success: true, physician });
  } catch (error) {
    console.error("Error fetching physician:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Add patient to physician's list
router.post("/patients/add",  async (req, res) => {
  const { physicianId, patientId } = req.body;

  try {
    // Find the physician by ID
    const physician = await Physician.findById(physicianId);

    // If the physician is not found, return a 404 status
    if (!physician) {
      return res
        .status(404)
        .json({ success: false, message: "Physician not found." });
    }

    // Add the patient ID to the physician's patients array
    physician.patients.push(patientId);
    // Save the updated physician document
    await physician.save();

    // Respond with a success message
    res.json({ success: true, message: "Patient added successfully." });
  } catch (error) {
    // Log any errors and respond with a 500 status
    console.error("Error adding patient:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Get last 7 days of the selected user's sensor data
router.get("/patient-summary/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      // If the user is not found, return a 404 status
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Calculate the date range for the last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 7
    );

    // Query to find sensor data for the user's devices in the last 7 days
    const query = {
      device_id: { $in: user.devices.map((device) => device.device_id) },
      createdAt: { $gte: sevenDaysAgo },
    };

    // Execute the query to find sensor data
    const sensors = await Sensor.find(query).exec();

    // If no sensor data is found, return a 404 status
    if (!sensors || sensors.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }

    // Extract device IDs and BPM values from the sensor data
    const devices = user.devices.map((device) => device.device_id);
    const bpms = sensors.map((sensor) => sensor.bpm);

    // Calculate average, maximum, and minimum BPM values
    const averageBpm = bpms.reduce((sum, bpm) => sum + bpm, 0) / bpms.length;
    const maxBpm = Math.max(...bpms);
    const minBpm = Math.min(...bpms);

    // Log patient summary
    console.log("Patient summary:", {
      name: user.email,
      avg_hr: averageBpm,
      min_hr: minBpm,
      max_hr: maxBpm,
      devices: devices,
      measurement_frequency: user.measurementFrequency || 30,
    });

    // Respond with the patient summary
    res.json({
      name: user.email, // Assuming email as name, change if needed
      avg_hr: averageBpm,
      min_hr: minBpm,
      max_hr: maxBpm,
      devices: devices,
      measurement_frequency: user.measurementFrequency || 30, // Assuming a default value
    });
  } catch (error) {
    // Log any errors and respond with a 500 status
    console.error("Error fetching patient summary:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});
// Additional physician-specific routes (e.g., patient summary, detailed view) would go here

module.exports = router;
