const db = require("../db");

const deviceSchema = new db.Schema({
  device_id: String,
  measurementInterval: { type: Number, default: 30 },
  startTime: { type: String, default: "06:00" },
  endTime: { type: String, default: "22:00" },
});

const userSchema = new db.Schema({
  email: String,
  passwordHash: String,
  devices: [deviceSchema],
  lastAccess: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

const User = db.model("User", userSchema);

module.exports = User;
