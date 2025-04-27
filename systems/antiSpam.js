const { Collection } = require('discord.js');
const { createEmbed } = require('../utils/embedBuilder');
const logger = require('../utils/logger');
const config = require('../config');

// Collections to track user messages
const userMessages = new Collection();
const userWarnings = new Collection();

/**
 * Richtet den Anti-Spam-Schutz ein
 * @param {Client} client - Der Discord-Client
 */
function setupAntiSpam(client) {
  if (!config.antiSpam.enabled) {
    logger.info('Anti-Spam-Schutz ist deaktiviert');
    return;
  }
  
  logger.info('Anti-Spam-Schutz wird eingerichtet');
  
  // Bereinigt alte Nachrichten und Warnungen alle 10 Minuten
  setInterval(() => {
    userMessages.clear();
    userWarnings.sweep(count => count <= 0);
  }, 10 * 60 * 1000);
}

/**
 * Verarbeitet eine Nachricht zur Spam-Erkennung
 * @param {Message} message - Die zu prüfende Nachricht
 */
async function handleMessage(message) {
  if (!config.antiSpam.enabled) return;
  if (message.author.bot) return;
  
  try {
    const { author, content, channel, guild } = message;
    const now = Date.now();
    
    // Benutzernachrichten abrufen oder neuen Eintrag erstellen
    if (!userMessages.has(author.id)) {
      userMessages.set(author.id, []);
    }
    
    const userMessageList = userMessages.get(author.id);
    
    // Add this message to the user's message list
    userMessageList.push({
      content,
      timestamp: now
    });
    
    // Remove old messages outside the time window
    const timeWindow = config.antiSpam.messageTimeWindow * 1000;
    const recentMessages = userMessageList.filter(msg => now - msg.timestamp < timeWindow);
    
    userMessages.set(author.id, recentMessages);
    
    // Check if user has sent too many messages in the time window
    if (recentMessages.length >= config.antiSpam.messageThreshold) {
      // Check for duplicate messages
      const duplicateCount = {};
      
      recentMessages.forEach(msg => {
        if (!duplicateCount[msg.content]) {
          duplicateCount[msg.content] = 0;
        }
        duplicateCount[msg.content]++;
      });
      
      const duplicateDetected = Object.values(duplicateCount).some(count => count >= config.antiSpam.duplicateThreshold);
      
      if (duplicateDetected || recentMessages.length > config.antiSpam.messageThreshold * 1.5) {
        // Delete the spam messages
        for (const msg of recentMessages) {
          try {
            const fetchedMessage = await channel.messages.fetch(msg.id);
            if (fetchedMessage) {
              await fetchedMessage.delete();
            }
          } catch (error) {
            // Ignore errors from messages that can't be deleted
          }
        }
        
        // Clear the messages now that they're deleted
        userMessages.set(author.id, []);
        
        // Get or set warning count
        const warningCount = userWarnings.get(author.id) || 0;
        userWarnings.set(author.id, warningCount + 1);
        
        // Log the spam detection
        logger.warn(`Spam detected from ${author.tag} (${author.id}): ${recentMessages.length} messages in ${config.antiSpam.messageTimeWindow} seconds`);
        
        const logChannel = guild.channels.cache.get(config.logChannelId);
        
        if (logChannel) {
          logChannel.send({
            embeds: [createEmbed(
              '> Spam Detected',
              `**User:** ${author.tag} (${author.id})\n**Action:** Warning\n**Reason:** Sent ${recentMessages.length} messages in ${config.antiSpam.messageTimeWindow} seconds`,
              config.colors.error
            )]
          });
        }
        
        // Warn the user
        try {
          await author.send({
            embeds: [createEmbed(
              '> Spam Warning',
              `You have been warned for spamming in **${guild.name}**.\n\nPlease avoid sending too many messages in a short period of time.\n\nWarning count: ${warningCount + 1}`,
              config.colors.error
            )]
          });
        } catch (error) {
          // Can't DM the user, notify in channel
          await channel.send({
            content: `<@${author.id}>`,
            embeds: [createEmbed(
              '> Spam Warning',
              `You have been warned for spamming.\n\nPlease avoid sending too many messages in a short period of time.\n\nWarning count: ${warningCount + 1}`,
              config.colors.error
            )],
            ephemeral: true
          });
        }
        
        // Take action based on warning count and configuration
        if (warningCount >= 2) {
          const member = await guild.members.fetch(author.id);
          
          if (config.antiSpam.action === 'mute' && member) {
            // Mute the user
            try {
              await member.timeout(config.antiSpam.muteDuration, 'Automated mute for spam');
              
              if (logChannel) {
                logChannel.send({
                  embeds: [createEmbed(
                    '> User Muted',
                    `**User:** ${author.tag} (${author.id})\n**Reason:** Automated mute for spam\n**Duration:** ${config.antiSpam.muteDuration / 60000} minutes`,
                    config.colors.accent
                  )]
                });
              }
              
              // Reset warnings after taking action
              userWarnings.set(author.id, 0);
            } catch (error) {
              logger.error(`Failed to mute user ${author.tag}: ${error}`);
            }
          } else if (config.antiSpam.action === 'kick' && member) {
            // Kick the user
            try {
              await member.kick('Automated kick for spam');
              
              if (logChannel) {
                logChannel.send({
                  embeds: [createEmbed(
                    '> User Kicked',
                    `**User:** ${author.tag} (${author.id})\n**Reason:** Automated kick for spam`,
                    config.colors.accent
                  )]
                });
              }
              
              // Remove warnings after taking action
              userWarnings.delete(author.id);
            } catch (error) {
              logger.error(`Failed to kick user ${author.tag}: ${error}`);
            }
          } else if (config.antiSpam.action === 'ban' && member) {
            // Ban the user
            try {
              await member.ban({ reason: 'Automated ban for spam' });
              
              if (logChannel) {
                logChannel.send({
                  embeds: [createEmbed(
                    '> User Banned',
                    `**User:** ${author.tag} (${author.id})\n**Reason:** Automated ban for spam`,
                    config.colors.accent
                  )]
                });
              }
              
              // Remove warnings after taking action
              userWarnings.delete(author.id);
            } catch (error) {
              logger.error(`Failed to ban user ${author.tag}: ${error}`);
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error(`Error in anti-spam system: ${error}`);
  }
}

module.exports = {
  setupAntiSpam,
  handleMessage
};
