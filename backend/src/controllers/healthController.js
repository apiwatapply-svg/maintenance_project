function checkHealth(req, res) {
  res.json({
    status: "ok",
    service: "maintenance-project-backend"
  });
}

module.exports = {
  checkHealth
};
