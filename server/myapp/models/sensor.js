const db = require("../db");

const sensorSchema = new db.Schema({
  bpm: { type: Number, min: 0 },
  spo2: { type: Number, min: 0 },
  created_at: { type: Date, default: Date.now },
});

const Sensor = db.model("Sensor", sensorSchema);

module.exports = Sensor;
