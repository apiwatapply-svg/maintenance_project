const toolingService = require("../services/toolingService");

async function dashboard(req, res, next) {
  try {
    res.json(await toolingService.dashboard());
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    res.json(await toolingService.list(req.params.resource, req.query));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  dashboard,
  list
};
