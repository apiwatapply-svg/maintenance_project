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

async function createRequest(req, res, next) {
  try {
    res.status(201).json(await toolingService.createRequest({
      ...req.body,
      requesterId: req.toolingUser?.id,
      departmentId: req.body.departmentId || req.toolingUser?.departmentId
    }));
  } catch (error) {
    next(error);
  }
}

async function listRequests(req, res, next) {
  try {
    res.json(await toolingService.listRequests(req.query));
  } catch (error) {
    next(error);
  }
}

async function getRequestById(req, res, next) {
  try {
    res.json(await toolingService.getRequestById(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function approveRequest(req, res, next) {
  try {
    res.json(await toolingService.approveRequest(req.params.id, req.toolingUser?.id));
  } catch (error) {
    next(error);
  }
}

async function rejectRequest(req, res, next) {
  try {
    res.json(await toolingService.rejectRequest(
      req.params.id,
      req.toolingUser?.id,
      req.body?.remark
    ));
  } catch (error) {
    next(error);
  }
}

async function issueRequest(req, res, next) {
  try {
    res.json(await toolingService.issueRequest(req.params.id, req.toolingUser?.id));
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
  stockOut,
  createRequest,
  listRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  issueRequest
};
