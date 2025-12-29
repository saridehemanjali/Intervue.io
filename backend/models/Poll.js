const mongoose = require("mongoose");

const PollSchema = new mongoose.Schema({
  question: String,
  options: [String],
  startTime: Number,
  endTime: Number,
  active: Boolean,
});

module.exports = mongoose.model("Poll", PollSchema);
