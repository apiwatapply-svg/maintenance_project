const {
  createToolingResource,
  deleteToolingResource,
  listToolingResource,
  updateToolingResource
} = require("../repositories/toolingRepository");

async function list(req, res, next) {
  try {
    const result = await listToolingResource(req.params.resource, req.query);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const result = await createToolingResource(req.params.resource, req.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await updateToolingResource(req.params.resource, req.params.id, req.body);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await deleteToolingResource(req.params.resource, req.params.id);
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
