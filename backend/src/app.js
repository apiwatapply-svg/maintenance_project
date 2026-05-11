const express = require("express");
const cors = require("cors");
const path = require("path");

const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
const notFound = require("./middlewares/notFound");
const { getCorsOrigins } = require("./config/cors");

const app = express();

app.use(
  cors({
    origin: getCorsOrigins()
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/images", express.static(path.join(__dirname, "..", "images")));
app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
