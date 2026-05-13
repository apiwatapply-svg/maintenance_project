const express = require("express");
const adminRoutes = require("./adminRoutes");
const authRoutes = require("./authRoutes");
const healthRoutes = require("./healthRoutes");
const jobRequestRoutes = require("./jobRequestRoutes");
const toolingRoutes = require("./toolingRoutes");

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use("/job-requests", jobRequestRoutes);
router.use("/tooling", toolingRoutes);

module.exports = router;
