const Device = require('../models/device');

exports.addDevice = async (req, res) => {
  const { userId, deviceName } = req.body;
  try {
    const newDevice = new Device({ userId, deviceName });
    await newDevice.save();
    res.status(201).send('Device added successfully');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.removeDevice = (req, res) => {
  // Remove device logic
};

exports.getDeviceData = (req, res) => {
  // Get device data
};
