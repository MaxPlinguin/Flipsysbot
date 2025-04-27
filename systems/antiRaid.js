const { Collection } = require('discord.js');
const { createEmbed } = require('../utils/embedBuilder');
const logger = require('../utils/logger');
const config = require('../config');

// Collection to track recent joins
const recentJoins = new Collection();

/**
 * Richtet den Anti-Raid-Schutz ein
 * @param {Client} client - Der Discord-Client
 */
function setupAntiRaid(client) {
  if (!config.antiRaid.enabled) {
    logger.info('Anti-Raid-Schutz ist deaktiviert');
    return;
  }
  
  logger.info('Anti-Raid-Schutz wird eingerichtet');
  
  // Bereinigt alte Einträge aus recentJoins alle 5 Minuten
  setInterval(() => {
    const now = Date.now();
    recentJoins.sweep(timestamp => now - timestamp > (config.antiRaid.joinTimeWindow * 1000));
  }, 5 * 60 * 1000);
}

/**
 * Verarbeitet den Beitritt eines neuen Mitglieds zur Erkennung potenzieller Raids
 * @param {GuildMember} member - Das Mitglied, das beigetreten ist
 */
async function handleMemberJoin(member) {
  if (!config.antiRaid.enabled) return;
  
  try {
    const now = Date.now();
    
    // Diesen Beitritt zu den letzten Beitritten hinzufügen
    recentJoins.set(member.id, now);
    
    // Zählt kürzliche Beitritte innerhalb des Zeitfensters
    const recentJoinCount = recentJoins.filter(timestamp => now - timestamp < (config.antiRaid.joinTimeWindow * 1000)).size;
    
    // Prüft, ob der Schwellenwert überschritten wurde
    if (recentJoinCount >= config.antiRaid.joinThreshold) {
      logger.warn(`Möglicher Raid erkannt! ${recentJoinCount} Mitglieder sind in den letzten ${config.antiRaid.joinTimeWindow} Sekunden beigetreten.`);
      
      const guild = member.guild;
      
      // Den möglichen Raid protokollieren
      const logChannel = guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [createEmbed(
            '> ⚠️ Möglicher Raid erkannt',
            `${recentJoinCount} Mitglieder sind in den letzten ${config.antiRaid.joinTimeWindow} Sekunden beigetreten.\n\nAutomatische Aktion: ${config.antiRaid.action === 'lockdown' ? 'Server-Sperrung' : 'Nur Benachrichtigung'}`,
            config.colors.error
          )]
        });
      }
      
      // Administratoren benachrichtigen
      const adminRole = guild.roles.cache.get(config.adminRoleId);
      if (logChannel && adminRole) {
        logChannel.send({
          content: `<@&${adminRole.id}> Möglicher Raid erkannt! Bitte überprüfe den Server.`
        });
      }
      
      // Konfigurierte Aktion ausführen
      if (config.antiRaid.action === 'lockdown') {
        // Server sperren (verhindert, dass neue Mitglieder Kanäle sehen können)
        const everyoneRole = guild.roles.everyone;
        
        // Alle Kanäle abrufen
        const channels = guild.channels.cache.filter(channel => 
          channel.permissionsFor(everyoneRole).has('ViewChannel')
        );
        
        // Protokollieren, welche Kanäle gesperrt werden
        logger.info(`${channels.size} Kanäle werden aufgrund von Raid-Erkennung gesperrt`);
        
        // Berechtigungen für jeden Kanal aktualisieren
        for (const [, channel] of channels) {
          try {
            await channel.permissionOverwrites.edit(everyoneRole, {
              ViewChannel: false
            });
            logger.info(`Kanal gesperrt: ${channel.name}`);
          } catch (error) {
            logger.error(`Konnte Kanal ${channel.name} nicht sperren: ${error}`);
          }
        }
        
        // Die Sperrung protokollieren
        if (logChannel) {
          logChannel.send({
            embeds: [createEmbed(
              '> 🔒 Server-Sperrung aktiviert',
              `Aufgrund eines möglichen Raids wurde der Server gesperrt. Bitte kontaktiere einen Administrator, um die Sperrung aufzuheben.`,
              config.colors.error
            )]
          });
        }
      }
    }
  } catch (error) {
    logger.error(`Fehler im Anti-Raid-System: ${error}`);
  }
}

module.exports = {
  setupAntiRaid,
  handleMemberJoin
};
