const { listSimulationMachines } = require("../repositories/mmsRepository");

async function getSimulationMachines(req, res, next) {
  try {
    const machines = await listSimulationMachines();

    res.json({
      data: machines,
      meta: {
        source: "mssql",
        timestampUtc: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSimulationMachines
};

