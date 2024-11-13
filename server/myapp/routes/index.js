var express = require("express");
var router = express.Router();
const mongoose = require("mongoose");

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

// Reset or drop the database
router.get("/reset", async (req, res) => {
  try {
    // Ensure this is a secure route by adding some sort of authentication if necessary
    await mongoose.connection.db.dropDatabase();
    console.log("Database dropped successfully.");

    // Send success response
    res.status(200).json({ response: "Database reset successfully." });
  } catch (err) {
    console.error("Error resetting the database:", err);
    res.status(500).json({ error: "Failed to reset the database." });
  }
});

module.exports = router;
