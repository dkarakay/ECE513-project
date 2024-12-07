// models/Physician.js

const mongoose = require("mongoose");

const PhysicianSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  patients: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  // Add additional fields if necessary
});

module.exports = mongoose.model("Physician", PhysicianSchema);
