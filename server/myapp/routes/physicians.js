var express = require("express");
var router = express.Router();
var Physician = require("../models/physician");
var User = require("../models/user");
var Sensor = require("../models/sensor");

const jwt = require("jwt-simple");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const secret = fs.readFileSync(__dirname + "/../keys/jwtkey").toString();

// Middleware to get the logged-in physician's ID
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

// Physician Registration Endpoint
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

    if (!physician) {
      return res
        .status(404)
        .json({ success: false, message: "Physician not found." });
    }
    const patientsWithStats = await Promise.all(
      physician.patients.map(async (patientId) => {
        const user = await User.findById(patientId);

        if (!user) {
          return null;
        }

        const now = new Date();
        const sevenDaysAgo = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 7
        );

        const query = {
          device_id: { $in: user.devices.map((device) => device.device_id) },
          createdAt: { $gte: sevenDaysAgo },
        };
        const devices = user.devices.map((device) => device.device_id);
        const sensors = await Sensor.find(query).exec();

        const bpms = sensors.map((sensor) => sensor.bpm);
        const averageBpm =
          bpms.reduce((sum, bpm) => sum + bpm, 0) / bpms.length;
        const maxBpm = Math.max(...bpms);
        const minBpm = Math.min(...bpms);

        console.log("Patient summary:", {
          name: user.email,
          avg_hr: averageBpm,
          min_hr: minBpm,
          max_hr: maxBpm,
          devices: devices,
          measurement_frequency: user.measurementFrequency || 30,
        });

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
router.post("/patients/add", async (req, res) => {
  const { physicianId, patientId } = req.body;

  try {
    const physician = await Physician.findById(physicianId);

    if (!physician) {
      return res
        .status(404)
        .json({ success: false, message: "Physician not found." });
    }

    physician.patients.push(patientId);
    await physician.save();

    res.json({ success: true, message: "Patient added successfully." });
  } catch (error) {
    console.error("Error adding patient:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Get last 7 days of the selected user's sensor data
router.get("/patient-summary/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 7
    );

    const query = {
      device_id: { $in: user.devices.map((device) => device.device_id) },
      createdAt: { $gte: sevenDaysAgo },
    };

    const sensors = await Sensor.find(query).exec();

    if (!sensors || sensors.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }
    const devices = user.devices.map((device) => device.device_id);
    const bpms = sensors.map((sensor) => sensor.bpm);
    const averageBpm = bpms.reduce((sum, bpm) => sum + bpm, 0) / bpms.length;
    const maxBpm = Math.max(...bpms);
    const minBpm = Math.min(...bpms);

    console.log("Patient summary:", {
      name: user.email,
      avg_hr: averageBpm,
      min_hr: minBpm,
      max_hr: maxBpm,
      devices: devices,
      measurement_frequency: user.measurementFrequency || 30,
    });
    res.json({
      name: user.email, // Assuming email as name, change if needed
      avg_hr: averageBpm,
      min_hr: minBpm,
      max_hr: maxBpm,
      devices: devices,
      measurement_frequency: user.measurementFrequency || 30, // Assuming a default value
    });
  } catch (error) {
    console.error("Error fetching patient summary:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});
// Additional physician-specific routes (e.g., patient summary, detailed view) would go here

module.exports = router;
