const express = require('express');
const router = express.Router();
const { addDevice, removeDevice, getDeviceData } = require('../controllers/deviceController');

router.post('/add', addDevice);
router.delete('/remove/:id', removeDevice);
router.get('/:id/data', getDeviceData);

module.exports = router;
