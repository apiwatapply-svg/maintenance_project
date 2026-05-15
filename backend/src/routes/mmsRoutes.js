const express = require("express");
const { getMmsReport, getSimulationMachines } = require("../controllers/mmsController");

const router = express.Router();

router.get("/simulation/machines", getSimulationMachines);
router.get("/reports/history", getMmsReport);

module.exports = router;

