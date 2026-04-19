// middleware/sanitize.js
// Strips MongoDB operator keys ($, .) from req.body.
// Does NOT HTML-escape values — that must be done at render time (frontend).
// HTML escaping on the backend mangles passwords, tokens, and URLs.

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = deepSanitize(req.body);
  }
  next();
}

function deepSanitize(obj) {
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  if (obj && typeof obj === "object") {
    const clean = {};
    for (const key of Object.keys(obj)) {
      if (key.startsWith("$") || key.includes(".")) continue; // drop MongoDB operators
      clean[key] = deepSanitize(obj[key]);
    }
    return clean;
  }
  if (typeof obj === "string") return obj.trim();
  return obj;
}

module.exports = { sanitizeBody };
