const adminRepository = require("../repositories/adminRepository");

function parsePermissions(value) {
  if (!value) {
    return {};
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function createAccessError(message) {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

function requireToolingAccess(requiredAccess = "user") {
  return async function toolingAccessMiddleware(req, res, next) {
    try {
      const username = req.headers["x-username"];

      if (!username) {
        next(createAccessError("Toolling & Store access denied"));
        return;
      }

      const user = await adminRepository.findUserByUsername(username);
      const permissions = parsePermissions(user?.permissions);
      const access = permissions.toolingStore || "none";

      if (access !== "user" && access !== "admin") {
        next(createAccessError("Toolling & Store access denied"));
        return;
      }

      if (requiredAccess === "admin" && access !== "admin") {
        next(createAccessError("Toolling & Store admin access required"));
        return;
      }

      req.toolingUser = {
        ...user,
        access,
        permissions
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  parsePermissions,
  requireToolingAccess
};
