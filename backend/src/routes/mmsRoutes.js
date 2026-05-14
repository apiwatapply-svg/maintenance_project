const express = require("express");
const { getSimulationMachines } = require("../controllers/mmsController");

const router = express.Router();

router.get("/simulation/machines", getSimulationMachines);

module.exports = router;

