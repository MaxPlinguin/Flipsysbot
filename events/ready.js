
const logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    logger.info(`Logged in as ${client.user.tag}!`);
    
    // Rotating status messages
    const activities = [
      { text: '𝐅𝐥𝐢𝐩𝐬𝐲 Server', type: 'WATCHING' },
      { text: '/help für Hilfe', type: 'WATCHING' },
      { text: `Ping: ${client.ws.ping}ms`, type: 'PLAYING' }
    ];
    
    let currentActivity = 0;
    
    // Update status every 10 seconds
    setInterval(() => {
      const activity = activities[currentActivity];
      client.user.setActivity(activity.text, { type: activity.type });
      currentActivity = (currentActivity + 1) % activities.length;
    }, 10000);
    
    logger.info(`Bot is serving ${client.guilds.cache.size} servers`);
    
    client.guilds.cache.forEach(guild => {
      logger.info(`Connected to server: ${guild.name} (${guild.id})`);
      logger.info(`Server has ${guild.memberCount} members`);
    });
  },
};
