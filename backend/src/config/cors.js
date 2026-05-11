function getCorsOrigins() {
  const origins = new Set(
    (process.env.FRONTEND_URL || "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  );

  if (origins.has("http://localhost:3000")) {
    origins.add("http://127.0.0.1:3000");
  }

  return Array.from(origins);
}

module.exports = {
  getCorsOrigins
};
