const CONFIG = require("./config");

function timestamp() {
  return new Date().toISOString();
}

function info(...args) {
  if (!CONFIG.ENABLE_LOGGING) return;
  console.log(`[INFO] ${timestamp()}`, ...args);
}

function warn(...args) {
  if (!CONFIG.ENABLE_LOGGING) return;
  console.warn(`[WARN] ${timestamp()}`, ...args);
}

function error(...args) {
  if (!CONFIG.ENABLE_LOGGING) return;
  console.error(`[ERROR] ${timestamp()}`, ...args);
}

module.exports = {
  info,
  warn,
  error
};
