// middleware/auth.js

const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.status(401).json({ success: false, message: 'No token provided.' });
    
    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid token.' });
        req.user = user;
        next();
    });
}

module.exports = authenticateToken;
