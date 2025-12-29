import Poll from "../models/Poll.js";
import Vote from "../models/Vote.js";

class PollService {
  static async createPoll(data) {
    const activePoll = await Poll.findOne({ isActive: true });

    if (activePoll) {
      const votes = await Vote.countDocuments({ pollId: activePoll._id });
      if (votes < activePoll.totalStudents) {
        throw new Error("Previous poll still active or unanswered");
      }
      activePoll.isActive = false;
      await activePoll.save();
    }

    const endTime = Date.now() + data.duration * 1000;

    const poll = await Poll.create({
      question: data.question,
      options: data.options,
      duration: data.duration,
      endTime,
      isActive: true
    });

    return poll;
  }

  static async getPollHistory() {
    const polls = await Poll.find({ isActive: false }).sort({ createdAt: -1 });

    const result = [];
    for (const poll of polls) {
      const votes = await Vote.aggregate([
        { $match: { pollId: poll._id } },
        { $group: { _id: "$option", count: { $sum: 1 } } }
      ]);

      result.push({
        poll,
        results: votes
      });
    }
    return result;
  }
}

export default PollService;
