// routes/physicians.js

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authenticateToken = require("../middleware/auth");
const Physician = require("../models/Physician"); // Import Physician model
const config = require("../config"); // Import configuration

// Physician Registration Endpoint
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  try {
    // Check if physician already exists
    const existingPhysician = await Physician.findOne({ email });
    if (existingPhysician) {
      return res.status(409).json({ success: false, message: "Physician already exists." });
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

    res.status(201).json({ success: true, message: "Physician registered successfully." });
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
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  try {
    // Find physician by email
    const physician = await Physician.findOne({ email });
    if (!physician) {
      return res.status(404).json({ success: false, message: "Physician not found." });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, physician.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: physician._id, email: physician.email },
      config.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log(`Physician logged in: ${email}`);

    res.json({ success: true, token });
  } catch (error) {
    console.error("Error during physician login:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Fetch All Patients for Physician
router.get("/patients", authenticateToken, async (req, res) => {
  const physicianId = req.user.id;

  try {
    // Fetch patients associated with the physician
    // Replace with actual database logic
    // For demonstration, returning static data
    const patients = [
      {
        id: "patient1",
        name: "John Doe",
        avg_hr: 72,
        min_hr: 60,
        max_hr: 85,
      },
      {
        id: "patient2",
        name: "Jane Smith",
        avg_hr: 75,
        min_hr: 65,
        max_hr: 90,
      },
      // Add more patients as needed
    ];

    res.json({ success: true, patients });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Additional physician-specific routes (e.g., patient summary, detailed view) would go here
// GET /physicians - List All Physicians (Admin Only)
router.get("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const physicians = await Physician.find({}, "-password");
    res.json({ success: true, physicians });
  } catch (error) {
    console.error("Error fetching physicians:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

module.exports = router;
