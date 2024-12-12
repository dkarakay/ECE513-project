var express = require("express");
var router = express.Router();
var User = require("../models/user");
var Sensor = require("../models/sensor");
var Physician = require("../models/physician");

const jwt = require("jwt-simple");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const secret = fs.readFileSync(__dirname + "/../keys/jwtkey").toString();

async function getUserId(req, res, next) {
  if (!req.headers["x-auth"]) {
    console.log("Body: ");
    console.log(req.body);
    console.log("Query: ");
    console.log(req.query);

    // If type is GET, check query string
    if (req.method === "GET") {
      if (req.query.userId) {
        req.userId = req.query.userId;
        return next();
      }
    }
    if (req.method === "POST") {
      if (req.body.userId) {
        req.userId = req.body.userId;
        return next();
      }
    }

    if (req.body.userId) {
      req.userId = req.body.userId;
      return next();
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

router.post("/register", async function (req, res) {
  try {
    // Check if the email already exists
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      return res
        .status(401)
        .json({ success: false, msg: "This email already used" });
    }

    // Create a new user
    const passwordHash = bcrypt.hashSync(req.body.password, 10);
    const newUser = new User({
      email: req.body.email,
      passwordHash: passwordHash,
      devices: [
        {
          device_id: req.body.device_id,
          measurementInterval: 30,
          startTime: "06:00",
          endTime: "22:00",
        },
      ],
      createdAt: new Date(),
    });

    // Save the new user
    await newUser.save();
    let msgStr = `User (${req.body.email}) account has been created.`;
    res.status(201).json({ success: true, message: msgStr });
    console.log(msgStr);
  } catch (err) {
    res.status(400).json({ success: false, err: err });
  }
});

router.post("/login", async function (req, res) {
  if (!req.body.email || !req.body.password) {
    return res.status(401).json({ error: "Missing email and/or password" });
  }

  try {
    // Get user from the database
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      // Username not in the database
      return res.status(401).json({ error: "Login failure!!" });
    }

    // Check if password matches
    if (bcrypt.compareSync(req.body.password, user.passwordHash)) {
      const token = jwt.encode({ email: user.email }, secret);

      // Update user's last access time
      user.lastAccess = new Date();
      await user.save();

      // Send back a token that contains the user's email
      res
        .status(201)
        .json({ success: true, token: token, msg: "Login success" });
    } else {
      res
        .status(401)
        .json({ success: false, msg: "Email or password invalid." });
    }
  } catch (err) {
    console.log("Error:", err);
    res.status(400).send(err);
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
    res.status(401).json({ success: false, message: "Invalid JWT" });
  }
});

router.post("/update-password", getUserId, async (req, res) => {
  const currentPassword = req.body.currentPassword;
  const newPassword = req.body.newPassword;

  if (!currentPassword || !newPassword) {
    return res.status(400).send("Current and new password are required.");
  }

  try {
    const user = await User.findById(req.userId, "email passwordHash");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).send("Current password is incorrect.");
    }

    const new_passwordHash = bcrypt.hashSync(newPassword, 10);

    // Update the user's password in the database
    user.passwordHash = new_passwordHash;
    await user.save();

    res.send("Password updated successfully.");
  } catch (error) {
    res.status(500).send("Server error.");
  }
});

router.post("/update-measurement-settings", getUserId, async (req, res) => {
  const { device_id, measurementInterval, startTime, endTime } = req.body;

  const userId = req.userId || req.body.userId;

  if (!device_id || !measurementInterval) {
    return res
      .status(400)
      .send(
        "Device ID, measurement interval, start time, and end time are required."
      );
  }

  try {
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

    res.status(200).json({
      success: true,
      message: "Measurement settings updated successfully!",
    });
  } catch (error) {
    res.status(500).send("Server error.");
  }
});

router.get("/measurement-settings/:device_id", getUserId, async (req, res) => {
  try {
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

    res.status(200).json({
      measurementInterval: device.measurementInterval,
      startTime: device.startTime,
      endTime: device.endTime,
    });
  } catch (error) {
    res.status(500).send("Server error.");
  }
});

// Get current user
router.get("/me", getUserId, async function (req, res) {
  try {
    const user = await User.findById(req.userId, "email devices physician");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    console.log(user);
    res.status(200).json({
      email: user.email,
      devices: user.devices,
      id: user._id,
      physician: user.physician,
    });
  } catch (error) {
    res.status(500).send("Server error.");
  }
});

router.post("/add-device", getUserId, async (req, res) => {
  const { device_id, measurementInterval, startTime, endTime } = req.body;

  if (!device_id || !measurementInterval || !startTime || !endTime) {
    return res
      .status(400)
      .send(
        "Device ID, measurement interval, start time, and end time are required."
      );
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    // Check if the device already exists
    const existingDevice = user.devices.find((d) => d.device_id === device_id);
    if (existingDevice) {
      return res
        .status(400)
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

    res.status(200).json({
      success: true,
      message: "Device added successfully!",
      device_id,
    });
  } catch (error) {
    res.status(500).send("Server error.");
  }
});

router.delete("/delete-device/:device_id", getUserId, async (req, res) => {
  try {
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

    res.status(200).json({
      success: true,
      message: "Device deleted successfully!",
    });
  } catch (error) {
    res.status(500).send("Server error.");
  }
});

router.get("/", async function (req, res, next) {
  try {
    var users = await User.find().exec();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// Get device details by device_id
router.get("/device/:device_id", async function (req, res, next) {
  try {
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
    res.json({
      device_id: device.device_id,
      measurementInterval: device.measurementInterval,
      startTime: device.startTime,
      endTime: device.endTime,
    });
  } catch (err) {
    next(err);
  }
});

// Add user as a patient to physician's list
router.post("/add-physician", getUserId, async (req, res) => {
  const { physicianId } = req.body;
  const userId = req.userId;

  if (!physicianId || !userId) {
    return res.status(400).json({
      success: false,
      message: "Physician ID and User ID are required.",
    });
  }

  try {
    const physician = await Physician.findById(physicianId);

    if (!physician) {
      return res
        .status(404)
        .json({ success: false, message: "Physician not found." });
    }

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

    res.status(200).json({
      success: true,
      message: "User added as a patient successfully.",
    });
  } catch (error) {
    console.error("Error adding user as a patient:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

module.exports = router;
