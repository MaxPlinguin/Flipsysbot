
const config = require('../config');
const logger = require('./logger');

const ADMIN_ROLE = '1350231029616480387';
const MOD_ROLE = '1350230733662191656';
const BASIC_ROLE = '1350226063170601183';
const INFO_ROLE = '1351912620634013766';

const ROLE_PERMISSIONS = {
  [ADMIN_ROLE]: ['*'], // All commands
  [MOD_ROLE]: ['mute', 'warn', 'ticket list', 'ticket claim', 'unmute', 'help', 'ping', 'close ticket'],
  [BASIC_ROLE]: ['help', 'ping'],
  [INFO_ROLE]: ['userinfo']
};

/**
 * Checks if a guild member has permission to use a specific command
 * @param {GuildMember} member - The guild member to check permissions for
 * @param {string} commandName - The command to check permissions for
 * @returns {boolean} - Whether the member has permission
 */
async function checkPermissions(member, commandName) {
  try {
    // Check each role the member has
    for (const role of member.roles.cache.values()) {
      const allowedCommands = ROLE_PERMISSIONS[role.id];
      
      // If role has permissions defined
      if (allowedCommands) {
        // Admin role can use all commands
        if (allowedCommands.includes('*')) {
          return true;
        }
        
        // Check if command is in allowed list
        if (allowedCommands.includes(commandName)) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    logger.error(`Error checking permissions: ${error}`);
    return false;
  }
}

/**
 * Gets the highest level role the member has
 * @param {GuildMember} member - The guild member
 * @returns {string} - The role level (admin, moderator, or member)
 */
function getHighestRole(member) {
  if (member.roles.cache.has(ADMIN_ROLE)) {
    return 'admin';
  }
  
  if (member.roles.cache.has(MOD_ROLE)) {
    return 'moderator'; 
  }
  
  if (member.roles.cache.has(BASIC_ROLE)) {
    return 'member';
  }
  
  return 'member';
}

module.exports = {
  checkPermissions,
  getHighestRole
};
