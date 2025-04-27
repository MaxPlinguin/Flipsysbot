const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Format the current date as YYYY-MM-DD
const getFormattedDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Get the current time formatted as HH:MM:SS
const getFormattedTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
};

// Log to console and file
const log = (level, message) => {
  const timestamp = `${getFormattedDate()} ${getFormattedTime()}`;
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  // Log to console
  console.log(logMessage);
  
  // Log to file
  const logFile = path.join(logsDir, `${getFormattedDate()}.log`);
  fs.appendFileSync(logFile, logMessage + '\n');
};

module.exports = {
  info: (message) => log('info', message),
  warn: (message) => log('warn', message),
  error: (message) => log('error', message),
  debug: (message) => log('debug', message)
};
