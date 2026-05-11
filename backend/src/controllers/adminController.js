const adminService = require("../services/adminService");

async function login(req, res, next) {
  try {
    res.json(await adminService.login(req.body));
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    res.json(await adminService.list(req.params.resource, req.query));
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    res.json(await adminService.getById(req.params.resource, req.params.id));
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await adminService.create(req.params.resource, req.body));
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    res.json(await adminService.update(req.params.resource, req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    res.json(await adminService.remove(req.params.resource, req.params.id));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  list,
  getById,
  create,
  update,
  remove
};
