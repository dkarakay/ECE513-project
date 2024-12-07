// db.js

const mongoose = require("mongoose");
const config = require("./config"); // Import configuration

mongoose.connect(config.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Connection Success
mongoose.connection.on('connected', () => {
  console.log(`Mongoose connected to ${config.MONGO_URI}`);
});

// Connection Error
mongoose.connection.on('error', (err) => {
  console.error(`Mongoose connection error: ${err}`);
});

// Disconnection
mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// Handle SIGINT for graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose disconnected through app termination');
  process.exit(0);
});

module.exports = mongoose;
