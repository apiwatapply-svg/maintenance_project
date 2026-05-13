const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env.local") });
dotenv.config({ path: path.join(__dirname, ".env") });

const app = require("./src/app");
const { createSocketServer } = require("./src/socket");

const port = process.env.PORT || 5000;
const server = require("http").createServer(app);

const io = createSocketServer(server);
app.set("io", io);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
