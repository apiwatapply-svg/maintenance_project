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

async function getById(req, res, next) {
  try {
    res.json(await toolingService.getById(req.params.resource, req.params.id));
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await toolingService.create(req.params.resource, req.body));
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    res.json(await toolingService.update(req.params.resource, req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    res.json(await toolingService.remove(req.params.resource, req.params.id));
  } catch (error) {
    next(error);
  }
}

async function searchItems(req, res, next) {
  try {
    res.json(await toolingService.searchItems(req.query.q));
  } catch (error) {
    next(error);
  }
}

async function findItemByQrCode(req, res, next) {
  try {
    res.json(await toolingService.findItemByQrCode(req.params.qrCode));
  } catch (error) {
    next(error);
  }
}

async function stockIn(req, res, next) {
  try {
    res.status(201).json(await toolingService.stockIn(req.body));
  } catch (error) {
    next(error);
  }
}

async function stockOut(req, res, next) {
  try {
    res.status(201).json(await toolingService.stockOut(req.body));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  dashboard,
  list,
  getById,
  create,
  update,
  remove,
  searchItems,
  findItemByQrCode,
  stockIn,
  stockOut
};
