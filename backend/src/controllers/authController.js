const { findActiveUserByUsername } = require("../repositories/authRepository");

const featureAccess = {
  admin: new Set(["all"]),
  pm: new Set(["all", "maintenance"]),
  store: new Set(["all", "tooling_store"]),
  job: new Set(["all", "maintenance", "qc", "production"])
};

function canAccessFeature(user, feature) {
  const allowedScopes = featureAccess[feature];

  if (!allowedScopes || !user) {
    return false;
  }

  if (feature === "admin") {
    return user.role === "super_admin" && user.adminScope === "all";
  }

  return allowedScopes.has(user.adminScope);
}

async function login(req, res, next) {
  try {
    const { username, password, feature } = req.body;

    if (!username || !password || !feature) {
      return res.status(400).json({ message: "Username, password, and feature are required." });
    }

    const user = await findActiveUserByUsername(username);

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    if (!canAccessFeature(user, feature)) {
      return res.status(403).json({ message: "This user cannot access the selected feature." });
    }

    const { password: _password, ...safeUser } = user;

    return res.json({
      user: safeUser,
      feature
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login
};
