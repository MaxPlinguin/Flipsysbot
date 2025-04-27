const { handleMessage } = require('../systems/antiSpam');
const logger = require('../utils/logger');

// Kanal-ID, in dem Nachrichten ohne Slash-Commands gelöscht werden sollen
const CLEAN_CHANNEL_ID = '1362092104070729932';

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    try {
      // Ignore messages from bots
      if (message.author.bot) return;
      
      // Handle anti-spam
      await handleMessage(message);
      
      // Lösche Nachrichten im angegebenen Kanal, die keine Slash-Commands sind
      if (message.channel.id === CLEAN_CHANNEL_ID) {
        // Wenn die Nachricht kein Slash-Command ist, lösche sie
        if (!message.content.startsWith('/')) {
          try {
            await message.delete();
            logger.info(`Nachricht von ${message.author.username} im sauberen Kanal gelöscht.`);
          } catch (deleteError) {
            logger.error(`Konnte Nachricht nicht löschen: ${deleteError}`);
          }
        }
      }
      
    } catch (error) {
      logger.error(`Error handling message: ${error}`);
    }
  },
};
