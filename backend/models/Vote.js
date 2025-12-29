const mongoose = require("mongoose");

const VoteSchema = new mongoose.Schema({
  pollId: mongoose.Schema.Types.ObjectId,
  studentId: String,
  optionIndex: Number,
});

VoteSchema.index({ pollId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Vote", VoteSchema);
