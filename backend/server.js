const app = require("./app");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const http = require("http");
const pollSocket = require("./sockets/poll.socket");

mongoose.connect("mongodb://127.0.0.1:27017/livepoll");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

pollSocket(io);

server.listen(4000, () => {
  console.log("Backend running on http://localhost:4000");
});
