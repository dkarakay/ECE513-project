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
      device_id: req.body.device_id,
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

router.get("/", async function (req, res, next) {
  try {
    var user = await User.find().exec();
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
