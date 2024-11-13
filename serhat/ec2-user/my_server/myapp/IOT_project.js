const express = require('express'); 
const mongoose = require('mongoose');
const bodyParser = require('express').json;  // Using the built-in body parser middleware

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser());

// Import routes
const userRoutes = require('./routes/userRoutes');
const deviceRoutes = require('./routes/deviceRoutes');

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.log(err));

// Routes
app.use('/users', userRoutes);  // Mount the user routes
app.use('/devices', deviceRoutes);  // Mount the device routes

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
