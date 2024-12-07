// to use mongoDB
const mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1/ece513project", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

module.exports = mongoose;
