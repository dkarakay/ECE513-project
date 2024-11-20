const db = require("../db");

const userSchema = new db.Schema({
    email:      String,
    passwordHash:   String,
    device_id:   String,
    lastAccess:     { type: Date, default: Date.now },
 });

const User = db.model("User", userSchema);

module.exports = User;
