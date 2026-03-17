// middleware/sanitize.js
// Strips any keys that start with $ or contain . from req.body
// Prevents MongoDB operator injection attacks like { "$gt": "" }

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
      if (key.startsWith("$") || key.includes(".")) continue; // drop dangerous keys
      clean[key] = typeof obj[key] === "string"
        ? escapeHtml(obj[key].trim())
        : deepSanitize(obj[key]);
    }
    return clean;
  }
  return obj;
}

// Strip HTML tags and dangerous characters from string values
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

module.exports = { sanitizeBody };
