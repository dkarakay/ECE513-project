const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deviceName: { type: String, required: true },
  measurements: [{ heartRate: Number, saturation: Number, timestamp: Date }]
});

module.exports = mongoose.model('Device', DeviceSchema);
