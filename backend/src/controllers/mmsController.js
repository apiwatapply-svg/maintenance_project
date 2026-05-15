const { listMmsReport, listSimulationMachines } = require("../repositories/mmsRepository");

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

async function getMmsReport(req, res, next) {
  try {
    const report = await listMmsReport(req.query);

    res.json({
      data: report,
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
  getMmsReport,
  getSimulationMachines
};

