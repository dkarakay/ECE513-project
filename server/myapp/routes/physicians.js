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
  console.log("Token:", token);
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
        const patient = await User.findById(patientId);

        if (!patient) {
          return null;
        }

        const now = new Date();
        const sevenDaysAgo = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 7
        );

        const sensors = await Sensor.find({
          device_id: { $in: patient.devices.map((device) => device.device_id) },
          created_at: { $gte: sevenDaysAgo },
        }).exec();

        const bpms = sensors.map((sensor) => sensor.bpm);
        const averageBpm = bpms.length
          ? bpms.reduce((sum, bpm) => sum + bpm, 0) / bpms.length
          : null;
        const maxBpm = bpms.length ? Math.max(...bpms) : null;
        const minBpm = bpms.length ? Math.min(...bpms) : null;

        return {
          ...patient.toObject(),
          stats: {
            averageBpm,
            maxBpm,
            minBpm,
          },
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

// Additional physician-specific routes (e.g., patient summary, detailed view) would go here

module.exports = router;
