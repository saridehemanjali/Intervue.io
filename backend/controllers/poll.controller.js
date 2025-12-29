import PollService from "../services/poll.service.js";

export const createPoll = async (req, res) => {
  try {
    const poll = await PollService.createPoll(req.body);
    res.status(201).json(poll);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getPollHistory = async (req, res) => {
  try {
    const polls = await PollService.getPollHistory();
    res.status(200).json(polls);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch poll history" });
  }
};
