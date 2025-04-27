/**
 * Minecraft Integration Module
 * Provides functions to interact with a Minecraft server via RCON
 */

const Rcon = require('rcon');
const config = require('./config');
const logger = require('./utils/logger');

// RCON-Verbindung
let rconClient = null;
let isConnected = false;

/**
 * Stellt eine Verbindung zum Minecraft-Server her
 * @returns {Promise<boolean>} - Erfolgsstatus der Verbindung
 */
async function connectToMinecraftServer() {
  return new Promise((resolve) => {
    try {
      // Wenn bereits verbunden, gib sofort true zurück
      if (isConnected && rconClient) {
        resolve(true);
        return;
      }

      // Erstelle einen neuen RCON-Client
      rconClient = new Rcon(
        config.minecraft.host,
        config.minecraft.port,
        config.minecraft.password,
        { tcp: true, challenge: false }
      );

      // Ereignishandler für Verbindung
      rconClient.on('auth', () => {
        logger.info('RCON-Authentifizierung erfolgreich');
        isConnected = true;
        resolve(true);
      });

      // Ereignishandler für Fehler
      rconClient.on('error', (error) => {
        logger.error(`RCON-Fehler: ${error}`);
        isConnected = false;
        resolve(false);
      });

      // Ereignishandler für Ende der Verbindung
      rconClient.on('end', () => {
        logger.info('RCON-Verbindung beendet');
        isConnected = false;
      });

      // Verbinde zum Server
      rconClient.connect();

      // Setze Timeout für den Verbindungsversuch
      setTimeout(() => {
        if (!isConnected) {
          logger.error('RCON-Verbindung-Timeout');
          resolve(false);
        }
      }, config.minecraft.timeout);
    } catch (error) {
      logger.error(`Fehler beim Verbinden mit dem RCON-Server: ${error}`);
      isConnected = false;
      resolve(false);
    }
  });
}

/**
 * Trennt die Verbindung zum Minecraft-Server
 */
function disconnectFromMinecraftServer() {
  if (rconClient && isConnected) {
    rconClient.disconnect();
    isConnected = false;
    logger.info('RCON-Verbindung getrennt');
  }
}

/**
 * Validates if a string is a valid Minecraft username
 * @param {string} username - The username to validate
 * @returns {boolean} - Whether the username is valid
 */
function isValidMinecraftUsername(username) {
  // Minecraft usernames are 3-16 characters long and can only contain
  // alphanumeric characters and underscores
  const regex = /^[a-zA-Z0-9_]{3,16}$/;
  return regex.test(username);
}

/**
 * Executes a command on the Minecraft server via RCON
 * @param {string} command - The command to execute
 * @returns {string} - The result of the command
 */
async function executeMinecraftCommand(command) {
  try {
    logger.info(`Versuche Minecraft-Befehl auszuführen: ${command}`);
    
    // Versuche zuerst, eine Verbindung zum Server herzustellen
    const connected = await connectToMinecraftServer();
    
    if (!connected) {
      logger.error('Konnte keine Verbindung zum Minecraft-Server herstellen');
      return config.messages.rcon_error;
    }
    
    // Führe den Befehl über RCON aus
    return new Promise((resolve) => {
      try {
        rconClient.send(command, (responseId, response) => {
          logger.info(`RCON Antwort: ${response}`);
          
          // Schließe die Verbindung nach Abschluss des Befehls
          disconnectFromMinecraftServer();
          
          // Wenn keine Antwort, bedeutet das normalerweise, dass der Befehl erfolgreich war
          if (!response) {
            // Versuche eine Antwort zu simulieren basierend auf dem Befehl
            if (command.startsWith('whitelist add')) {
              const username = command.split(' ')[2];
              resolve(`Added ${username} to the whitelist`);
            } else if (command.startsWith('whitelist remove')) {
              const username = command.split(' ')[2];
              resolve(`Removed ${username} from the whitelist`);
            } else {
              resolve('Command executed successfully');
            }
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        logger.error(`Fehler beim Senden des RCON-Befehls: ${error}`);
        disconnectFromMinecraftServer();
        resolve(config.messages.rcon_error);
      }
    });
  } catch (error) {
    logger.error(`Fehler beim Ausführen des Minecraft-Befehls: ${error}`);
    return config.messages.rcon_error;
  }
}

module.exports = {
  isValidMinecraftUsername,
  executeMinecraftCommand,
  connectToMinecraftServer,
  disconnectFromMinecraftServer
};