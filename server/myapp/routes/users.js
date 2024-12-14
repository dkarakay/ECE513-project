var express = require("express");
var router = express.Router();
var User = require("../models/user");
var Sensor = require("../models/sensor");
var Physician = require("../models/physician");

const jwt = require("jwt-simple");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const secret = fs.readFileSync(__dirname + "/../keys/jwtkey").toString();
const csrfProtection = require('csurf')({ cookie: true });
const xss = require("xss");

/**
 * Middleware to extract and set the user ID from the request.
 * 
 * This function checks for the presence of the "x-auth" header. If the header is not present,
 * it attempts to extract the user ID from the query string (for GET requests) or the request body (for POST requests).
 * If the user ID is found, it sets `req.userId` and calls the next middleware.
 * If the "x-auth" header is present, it decodes the JWT token to find the user and sets `req.userId`.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * 
 * @returns {void}
 * 
 * @throws {Error} If the JWT token is invalid or the user is not found.
 */
async function getUserId(req, res, next) {
  if (!req.headers["x-auth"]) {
    // If type is GET, check query string
    if (req.method === "GET") {
      if (req.query.userId) {
        req.userId = req.query.userId;
        return next();
      }
    }
    if (req.method === "POST") {
      if (req.body.userId) {
        req.userId = xss(req.body.userId);
        return next();
      }
    }

    return res
      .status(401)
      .json({ success: false, msg: "Missing X-Auth header" });
  }
  const token = req.headers["x-auth"];
  try {
    const decoded = jwt.decode(token, secret);
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    req.userId = user._id;
    next();
  } catch (ex) {
    res.status(401).json({ success: false, message: "Invalid JWT" });
  }
}

router.post("/register", csrfProtection, async function (req, res) {
  try {
    // Check if the email already exists
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      return res
        .status(409)
        .json({ success: false, msg: "This email already used" });
    }

    // Create a new user with hashed password
    const passwordHash = bcrypt.hashSync(xss(req.body.password), 10);
    const newUser = new User({
      email: xss(req.body.email),
      passwordHash: passwordHash,
      devices: [
        {
          device_id: xss(req.body.device_id),
          measurementInterval: 30,
          startTime: "06:00",
          endTime: "22:00",
        },
      ],
      createdAt: new Date(),
    });

    // Save the new user to the database
    await newUser.save();
    let msgStr = `User (${req.body.email}) account has been created.`;
    res.status(201).json({ success: true, message: msgStr });
    console.log(msgStr);
  } catch (err) {
    // Handle errors and send response
    res.status(400).json({ success: false, err: err });
  }
});

router.post("/login", csrfProtection, async function (req, res) {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({ error: "Missing email and/or password" });
  }

  try {
    // Get user from the database
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      // Username not in the database
      return res.status(401).json({ error: "Login failure!!" });
    }

    // Check if password matches
    if (bcrypt.compareSync(xss(req.body.password), user.passwordHash)) {
      const token = jwt.encode({ email: user.email }, secret);

      // Update user's last access time
      user.lastAccess = new Date();
      await user.save();

      // Send back a token that contains the user's email
      res
        .status(200)
        .json({ success: true, token: token, msg: "Login success" });
    } else {
      res
        .status(401)
        .json({ success: false, msg: "Email or password invalid." });
    }
  } catch (err) {
    console.log("Error:", err);
    res.status(500).send(err);
  }
});

router.get("/status", getUserId, async function (req, res) {
  try {
    const user = await User.findById(req.userId, "email devices");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    // Send back email and device ID
    res.status(200).json({ email: user.email, devices: user.devices });
  } catch (ex) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Route to update the user's password
router.post("/update-password", getUserId, csrfProtection, async (req, res) => {
  const currentPassword = xss(req.body.currentPassword);
  const newPassword = xss(req.body.newPassword);

  // Check if both current and new passwords are provided
  if (!currentPassword || !newPassword) {
    return res.status(400).send("Current and new password are required.");
  }

  try {
    // Find the user by ID and select email and passwordHash fields
    const user = await User.findById(req.userId, "email passwordHash");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    // Compare the current password with the stored password hash
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).send("Current password is incorrect.");
    }

    // Hash the new password
    const new_passwordHash = bcrypt.hashSync(newPassword, 10);

    // Update the user's password in the database
    user.passwordHash = new_passwordHash;
    await user.save();

    // Send success response
    res.status(200).send("Password updated successfully.");
  } catch (error) {
    // Handle server error
    res.status(500).send("Server error.");
  }
});

router.post("/update-measurement-settings", getUserId, csrfProtection, async (req, res) => {
  const { device_id, measurementInterval, startTime, endTime } = xss(req.body);

  const userId = req.userId || xss(req.body.userId);

  // Check if device_id and measurementInterval are provided
  if (!device_id || !measurementInterval) {
    return res
      .status(400)
      .send(
        "Device ID, measurement interval, start time, and end time are required."
      );
  }

  try {
    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    // Find the device by device_id
    const device = user.devices.find((d) => d.device_id === device_id);
    if (!device) {
      return res.status(404).json({ success: false, msg: "Device not found" });
    }

    // Update the device's measurement settings
    device.measurementInterval = parseInt(measurementInterval);
    if (startTime) device.startTime = startTime;
    if (endTime) device.endTime = endTime;
    await user.save();

    // Send success response
    res.status(200).json({
      success: true,
      message: "Measurement settings updated successfully!",
    });
  } catch (error) {
    // Handle server error
    res.status(500).send("Server error.");
  }
});

// Route to get measurement settings for a specific device
router.get("/measurement-settings/:device_id", getUserId, async (req, res) => {
  try {
    // Find the user by userId
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    // Find the device by device_id
    const device = user.devices.find(
      (d) => d.device_id === req.params.device_id
    );
    if (!device) {
      return res.status(404).json({ success: false, msg: "Device not found" });
    }

    // Send back the measurement settings
    res.status(200).json({
      measurementInterval: device.measurementInterval,
      startTime: device.startTime,
      endTime: device.endTime,
    });
  } catch (error) {
    // Handle server error
    res.status(500).send("Server error.");
  }
});

// Route to get current user details
router.get("/me", getUserId, async function (req, res) {
  try {
    // Find the user by userId and select specific fields
    const user = await User.findById(req.userId, "email devices physician");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    console.log(user);
    // Send back user details
    res.status(200).json({
      email: user.email,
      devices: user.devices,
      id: user._id,
      physician: user.physician,
    });
  } catch (error) {
    // Handle server error
    res.status(500).send("Server error.");
  }
});

// Route to add a new device to the user's account
router.post("/add-device", getUserId, csrfProtection, async (req, res) => {
  const { device_id, measurementInterval, startTime, endTime } = xss(req.body);

  // Check if all required fields are provided
  if (!device_id || !measurementInterval || !startTime || !endTime) {
    return res
      .status(400)
      .send(
        "Device ID, measurement interval, start time, and end time are required."
      );
  }

  try {
    // Find the user by userId
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    // Check if the device already exists
    const existingDevice = user.devices.find((d) => d.device_id === device_id);
    if (existingDevice) {
      return res
        .status(409)
        .json({ success: false, msg: "Device already exists" });
    }

    // Add the new device
    user.devices.push({
      device_id,
      measurementInterval: parseInt(measurementInterval),
      startTime,
      endTime,
    });
    await user.save();

    // Send success response
    res.status(201).json({
      success: true,
      message: "Device added successfully!",
      device_id,
    });
  } catch (error) {
    // Handle server error
    res.status(500).send("Server error.");
  }
});

// Route to delete a device from the user's account
router.delete("/delete-device/:device_id", getUserId, async (req, res) => {
  try {
    // Find the user by userId
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    // Find the device by device_id
    const deviceIndex = user.devices.findIndex(
      (d) => d.device_id === req.params.device_id
    );
    if (deviceIndex === -1) {
      return res.status(404).json({ success: false, msg: "Device not found" });
    }

    // Remove the device
    user.devices.splice(deviceIndex, 1);
    await user.save();

    // Send success response
    res.status(200).json({
      success: true,
      message: "Device deleted successfully!",
    });
  } catch (error) {
    // Handle server error
    res.status(500).send("Server error.");
  }
});

// Route to get all users
router.get("/", async function (req, res, next) {
  try {
    // Find all users
    var users = await User.find().exec();
    // Send back the list of users
    res.status(200).json(users);
  } catch (err) {
    // Handle server error
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Route to get device details by device_id
router.get("/device/:device_id", async function (req, res, next) {
  try {
    // Find the user by device_id
    var user = await User.findOne({
      "devices.device_id": req.params.device_id,
    }).exec();
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    // Find the device by device_id
    const device = user.devices.find(
      (d) => d.device_id === req.params.device_id
    );
    if (!device) {
      return res.status(404).json({ success: false, msg: "Device not found" });
    }

    // Return the device details
    res.status(200).json({
      device_id: device.device_id,
      measurementInterval: device.measurementInterval,
      startTime: device.startTime,
      endTime: device.endTime,
    });
  } catch (err) {
    // Handle server error
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Route to add user as a patient to physician's list
router.post("/add-physician", getUserId, csrfProtection, async (req, res) => {
  const { physicianId } = xss(req.body);
  const userId = req.userId;

  // Check if physicianId and userId are provided
  if (!physicianId || !userId) {
    return res.status(400).json({
      success: false,
      message: "Physician ID and User ID are required.",
    });
  }

  try {
    // Find the physician by physicianId
    const physician = await Physician.findById(physicianId);
    if (!physician) {
      return res
        .status(404)
        .json({ success: false, message: "Physician not found." });
    }

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Check if the user is already assigned to a physician
    if (user.physician && user.physician.equals(physicianId)) {
      console.log("User is already assigned to this physician.");
    }

    // Assign the user to the physician
    user.physician = physicianId;
    await user.save();

    // Add the user to the physician's list of patients
    physician.patients.push(userId);
    await physician.save();

    // Send success response
    res.status(200).json({
      success: true,
      message: "User added as a patient successfully.",
    });
  } catch (error) {
    // Handle server error
    console.error("Error adding user as a patient:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

module.exports = router;
