// routes/physicians.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth');

// In-memory storage for example purposes (Replace with your database logic)
const physicians = [];

// Physician Registration Endpoint
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Check if physician already exists
    const existingPhysician = physicians.find(p => p.email === email);
    if (existingPhysician) {
        return res.status(409).json({ success: false, message: 'Physician already exists.' });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save the physician
        const newPhysician = {
            id: physicians.length + 1,
            email,
            password: hashedPassword
        };
        physicians.push(newPhysician);

        res.status(201).json({ success: true, message: 'Physician registered successfully.' });
    } catch (error) {
        console.error("Error during physician registration:", error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

// Physician Login Endpoint
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Find physician
    const physician = physicians.find(p => p.email === email);
    if (!physician) {
        return res.status(404).json({ success: false, message: 'Physician not found.' });
    }

    try {
        // Compare passwords
        const isMatch = await bcrypt.compare(password, physician.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // Generate JWT
        const token = jwt.sign({ id: physician.id, email: physician.email }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });

        res.json({ success: true, token });
    } catch (error) {
        console.error("Error during physician login:", error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

// Fetch All Patients for Physician
router.get('/patients', authenticateToken, (req, res) => {
    const physicianId = req.user.id;

    // Fetch patients associated with the physician
    // Replace with actual database logic
    // Example:
    const patients = [
        {
            id: "patient1",
            name: "John Doe",
            avg_hr: 72,
            min_hr: 60,
            max_hr: 85
        },
        // Add more patients as needed
    ];

    res.json({ success: true, patients });
});

// Other physician-specific routes (e.g., patient summary, detail) would go here

module.exports = router;
