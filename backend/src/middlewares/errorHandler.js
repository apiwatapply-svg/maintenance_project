function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isDatabaseError = ["EREQUEST", "ECONNCLOSED", "ETIMEOUT", "ESOCKET"].includes(err.code);
  const message = err.message || "Internal server error";

  if (statusCode >= 500) {
    console.error(`[API ERROR] ${req.method} ${req.originalUrl}`, {
      code: err.code,
      message,
      number: err.number,
      procedure: err.procedure,
      lineNumber: err.lineNumber
    });
  }

  res.status(statusCode).json({
    code: err.code || "API_ERROR",
    message: isDatabaseError ? `Database error: ${message}` : message
  });
}

module.exports = errorHandler;
