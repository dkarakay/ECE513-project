const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const axios = require('axios');

// Replace 'COM5' with the actual serial port your Arduino is connected to
const arduinoPort = 'COM5';
const baudRate = 9600;

// AWS Server URL
const serverUrl = 'http://ec2-3-144-187-197.us-east-2.compute.amazonaws.com:3000/post-data';

// Initialize Serial Port
const port = new SerialPort(arduinoPort, { baudRate: baudRate });

const parser = port.pipe(new Readline({ delimiter: '\n' }));

port.on('open', () => {
  console.log(`Connected to Arduino on ${arduinoPort} at ${baudRate} baud rate.`);
});

port.on('error', (err) => {
  console.error('Error connecting to Arduino:', err.message);
});

// Handle incoming data from Arduino
parser.on('data', async (line) => {
  const sensorValue = parseInt(line.trim());
  if (!isNaN(sensorValue)) {
    console.log(`Received from Arduino: ${sensorValue}`);
    try {
      const response = await axios.post(serverUrl, { value: sensorValue });
      console.log(`Data sent to server. Status: ${response.status}`);
    } catch (error) {
      console.error('Error sending data to server:', error.message);
    }
  } else {
    console.warn(`Invalid data received: ${line}`);
  }
});