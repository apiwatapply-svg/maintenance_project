const express = require("express");
const adminRoutes = require("./adminRoutes");
const healthRoutes = require("./healthRoutes");
const toolingRoutes = require("./toolingRoutes");

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/health", healthRoutes);
router.use("/tooling", toolingRoutes);

module.exports = router;
