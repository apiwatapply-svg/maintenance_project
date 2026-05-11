const toolingRepository = require("../repositories/toolingRepository");
const { getToolingResourceConfig } = require("../config/toolingResources");

async function dashboard() {
  return toolingRepository.dashboard();
}

async function list(resource, filters) {
  getToolingResourceConfig(resource);
  return toolingRepository.list(resource, filters);
}

module.exports = {
  dashboard,
  list
};
