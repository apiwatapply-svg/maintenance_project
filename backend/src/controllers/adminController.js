const {
  listAdminResource,
  createAdminResource,
  updateAdminResource,
  deleteAdminResource
} = require("../repositories/adminRepository");

async function list(req, res, next) {
  try {
    const result = await listAdminResource(req.params.resource, req.query);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const result = await createAdminResource(req.params.resource, req.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await updateAdminResource(req.params.resource, req.params.id, req.body);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await deleteAdminResource(req.params.resource, req.params.id);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  create,
  update,
  remove
};
