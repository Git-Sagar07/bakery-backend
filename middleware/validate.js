// middleware/validate.js
// ─────────────────────────────────────────────────────────────
// Lightweight validation helpers used across all routes.
// Each returns an error message string, or null if valid.
// ─────────────────────────────────────────────────────────────

const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
const isValidPhone = (val) => /^[6-9]\d{9}$/.test(val.replace(/[\s\-+]/g, ""));
const isValidPin   = (val) => /^\d{6}$/.test(val);

/**
 * Validate signup body.
 * Returns an error message string or null.
 */
const validateSignup = ({ name, email, phone, password }) => {
  if (!name  || !name.trim())     return "Name is required.";
  if (!email || !email.trim())    return "Email is required.";
  if (!isValidEmail(email))       return "Please enter a valid email address.";
  if (!password)                  return "Password is required.";
  if (password.length < 8)        return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password))    return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(password))    return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character.";
  if (phone && !isValidPhone(phone))   return "Phone must be 10 digits starting with 6–9.";
  return null;
};

/**
 * Validate login body.
 */
const validateLogin = ({ email, password }) => {
  if (!email || !email.trim()) return "Email is required.";
  if (!isValidEmail(email))    return "Please enter a valid email address.";
  if (!password)               return "Password is required.";
  return null;
};

/**
 * Validate address body.
 */
const validateAddress = ({ name, phone, street, city, pin }) => {
  if (!name   || !name.trim())   return "Name is required.";
  if (!phone  || !phone.trim())  return "Phone is required.";
  if (!isValidPhone(phone))      return "Phone must be 10 digits starting with 6–9.";
  if (!street || !street.trim()) return "Street address is required.";
  if (!city   || !city.trim())   return "City is required.";
  if (!pin    || !pin.trim())    return "PIN code is required.";
  if (!isValidPin(pin))          return "PIN code must be exactly 6 digits.";
  return null;
};

/**
 * Validate profile update body.
 */
const validateProfile = ({ name, email, phone }) => {
  if (!name  || !name.trim())  return "Name is required.";
  if (!email || !email.trim()) return "Email is required.";
  if (!isValidEmail(email))    return "Please enter a valid email address.";
  if (phone && !isValidPhone(phone)) return "Phone must be 10 digits starting with 6–9.";
  return null;
};

/**
 * Validate password change body.
 */
const validatePasswordChange = ({ currentPassword, newPassword }) => {
  if (!currentPassword)              return "Current password is required.";
  if (!newPassword)                  return "New password is required.";
  if (newPassword.length < 8)        return "New password must be at least 8 characters.";
  if (!/[A-Z]/.test(newPassword))    return "New password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(newPassword))    return "New password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(newPassword)) return "New password must contain at least one special character.";
  if (currentPassword === newPassword)    return "New password must be different from the current password.";
  return null;
};

module.exports = {
  validateSignup,
  validateLogin,
  validateAddress,
  validateProfile,
  validatePasswordChange,
  isValidEmail,
  isValidPhone,
};
