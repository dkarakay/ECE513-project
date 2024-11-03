const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(bodyParser.json());
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Ensure 'index.html' is in the correct directory
});

app.post('/post-data', (req, res) => {
    console.log('Received data:', req.body); // Log received data
    io.emit('data', req.body); // Emit the data to all connected clients
    res.status(200).send('Data received');
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});