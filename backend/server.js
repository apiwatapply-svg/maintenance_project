require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const app = require("./src/app");
const { getCorsOrigins } = require("./src/config/cors");
const { initSocket } = require("./src/services/socketService");

const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: getCorsOrigins()
  }
});

initSocket(io);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
