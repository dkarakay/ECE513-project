var express = require("express");
var router = express.Router();
var User = require("../models/user");

const jwt = require("jwt-simple");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const secret = fs.readFileSync(__dirname + "/../keys/jwtkey").toString();

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

router.get("/status", async function (req, res) {
  // See if the X-Auth header is set
  if (!req.headers["x-auth"]) {
    return res
      .status(401)
      .json({ success: false, msg: "Missing X-Auth header" });
  }
  // X-Auth should contain the token
  const token = req.headers["x-auth"];
  try {
    const decoded = jwt.decode(token, secret);
    // Fetch user details from the database
    const user = await User.findOne(
      { email: decoded.email },
      "email device_id"
    );
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    // Send back email and device ID
    res.status(200).json({ email: user.email, device_id: user.device_id });
  } catch (ex) {
    res.status(401).json({ success: false, message: "Invalid JWT" });
  }
});

router.post("/update-password", async (req, res) => {
  const currentPassword = req.body.currentPassword;
  const newPassword = req.body.newPassword;

  if (!currentPassword || !newPassword) {
    return res.status(400).send("Current and new password are required.");
  }

  const token = req.header("x-auth");
  if (!token) {
    return res.status(401).send("Access denied. No token provided.");
  }

  try {
    const decoded = jwt.decode(token, secret);
    const user = await User.findOne(
      { email: decoded.email },
      "email passwordHash"
    );
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
router.post("/update-measurement-settings", async (req, res) => {
  const { device_id, measurementInterval, startTime, endTime } = req.body;

  if (!device_id || !measurementInterval || !startTime || !endTime) {
    return res
      .status(400)
      .send(
        "Device ID, measurement interval, start time, and end time are required."
      );
  }

  const token = req.header("x-auth");
  if (!token) {
    return res.status(401).send("Access denied. No token provided.");
  }

  try {
    const decoded = jwt.decode(token, secret);
    const user = await User.findOne({ email: decoded.email });
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
    device.startTime = startTime;
    device.endTime = endTime;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Measurement settings updated successfully!",
    });
  } catch (error) {
    res.status(500).send("Server error.");
  }
});

router.get("/measurement-settings/:device_id", async (req, res) => {
  const token = req.header("x-auth");
  if (!token) {
    return res.status(401).send("Access denied. No token provided.");
  }

  try {
    const decoded = jwt.decode(token, secret);
    const user = await User.findOne({ email: decoded.email });
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
router.get("/me", async function (req, res) {
  const token = req.header("x-auth");
  if (!token) {
    return res.status(401).send("Access denied. No token provided.");
  }

  try {
    const decoded = jwt.decode(token, secret);
    const user = await User.findOne({ email: decoded.email }, "email devices");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    console.log(user);
    res.status(200).json({ email: user.email, devices: user.devices });
  } catch (error) {
    res.status(500).send("Server error.");
  }
});

router.post("/add-device", async (req, res) => {
  const { device_id, measurementInterval, startTime, endTime } = req.body;

  if (!device_id || !measurementInterval || !startTime || !endTime) {
    return res
      .status(400)
      .send(
        "Device ID, measurement interval, start time, and end time are required."
      );
  }

  const token = req.header("x-auth");
  if (!token) {
    return res.status(401).send("Access denied. No token provided.");
  }

  try {
    const decoded = jwt.decode(token, secret);
    const user = await User.findOne({ email: decoded.email });
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

router.delete("/delete-device/:device_id", async (req, res) => {
  const token = req.header("x-auth");
  if (!token) {
    return res.status(401).send("Access denied. No token provided.");
  }

  try {
    const decoded = jwt.decode(token, secret);
    const user = await User.findOne({ email: decoded.email });
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
    var user = await User.find().exec();
    res.json(user);
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

module.exports = router;
