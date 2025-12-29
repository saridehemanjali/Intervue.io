const pollService = require("../services/poll.service");

module.exports = (io) => {
  io.on("connection", async (socket) => {
    console.log("Client connected");

    const poll = await pollService.getActivePoll();
    if (poll) {
      socket.emit("poll_active", {
        poll,
        remainingTime: poll.endTime - Date.now(),
      });
    }

    socket.on("create_poll", async (data) => {
      const poll = await pollService.createPoll(
        data.question,
        data.options,
        data.duration
      );
      io.emit("poll_active", {
        poll,
        remainingTime: poll.endTime - Date.now(),
      });
    });

    socket.on("vote", async ({ pollId, studentId, optionIndex }) => {
      try {
        await pollService.submitVote(pollId, studentId, optionIndex);
        const results = await pollService.getResults(pollId);
        io.emit("poll_results", results);
      } catch (e) {
        socket.emit("vote_error", e.message);
      }
    });
  });
};
