const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const token = authorization.slice(7);

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "Server configuration error." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (typeof payload.sub !== "string") {
      return res.status(401).json({ error: "Invalid authentication token." });
    }

    req.user = { id: payload.sub };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

module.exports = requireAuth;
