
const logger = require('../utils/logger');
const config = require('../config');
const { createEmbed } = require('../utils/embedBuilder');
const { executeMinecraftCommand } = require('../minecraft');
const { pendingRequests } = require('../commands/utility/whitelist');

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user) {
    try {
      // Ignoriere Bot-eigene Reaktionen
      if (user.bot) return;
      
      // Prüfe, ob die Nachricht teilweise geladen ist (bei Caching-Problemen)
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (error) {
          logger.error(`Fehler beim Abrufen der Reaktion: ${error}`);
          return;
        }
      }
      
      const message = reaction.message;
      
      // Prüfe, ob dies eine ausstehende Anfrage ist
      if (!pendingRequests.has(message.id)) return;
      
      // Prüfe, ob die Reaktion in einem Admin-Kanal ist
      if (message.channelId !== config.adminChannelId) return;
      
      // Prüfe, ob der Benutzer die Moderator-Rolle hat
      let hasModerationPermission = false;
      
      if (reaction.message.guild) {
        const member = await reaction.message.guild.members.fetch(user.id);
        hasModerationPermission = member.roles.cache.some(role => 
          role.name === config.moderatorRoleName || role.id === config.moderatorRoleId || role.id === config.adminRoleId
        );
      }
      
      if (!hasModerationPermission) {
        // Entferne die Reaktion, wenn der Benutzer keine Moderator-Rolle hat
        await reaction.users.remove(user);
        return;
      }
      
      // Hole die Anfrage-Details
      const request = pendingRequests.get(message.id);
      const { userId, minecraftName, action } = request;
      
      // Behandle die Genehmigung oder Ablehnung
      if (reaction.emoji.name === '✅') {
        await handleApproval(message, minecraftName, action);
      } else if (reaction.emoji.name === '❌') {
        await handleRejection(message, minecraftName);
      }
      
    } catch (error) {
      logger.error(`Fehler im messageReactionAdd-Event: ${error}`);
    }
  }
};

async function handleApproval(message, minecraftName, action) {
  try {
    // Warte 2 Minuten
    await message.reply({ 
      embeds: [createEmbed(
        '> Whitelist Prüfung', 
        'Diese Anfrage wird in 2 Minuten final geprüft. Andere Admins können in dieser Zeit mit ❌ reagieren um die Anfrage abzulehnen.',
        config.colors.accent
      )]
    });

    await new Promise(resolve => setTimeout(resolve, 120000)); // 2 Minuten warten

    // Hole aktualisierte Nachricht um neue Reaktionen zu sehen
    const updatedMessage = await message.fetch();
    const xReactions = updatedMessage.reactions.cache.get('❌');
    const xCount = xReactions ? xReactions.count - 1 : 0; // -1 um Bot-Reaktion nicht mitzuzählen

    if (xCount >= 2) {
      await message.delete();
      return message.channel.send({
        embeds: [createEmbed(
          '> Whitelist Abgelehnt', 
          `[${minecraftName}] wurde von mehreren Admins abgelehnt`,
          config.colors.error
        )]
      });
    }

    const command = `whitelist ${action} ${minecraftName}`;
    const result = executeMinecraftCommand(command);
      
    if (result.toLowerCase().includes("added")) {
      await message.delete();
        
      const confirmMessage = await message.channel.send({
        embeds: [createEmbed(
          '> Whitelist Update', 
          `[${minecraftName}] wurde dem Server hinzugefügt`,
          config.colors.success
        )]
      });
        
      // Lösche die Nachricht nach 2 Tagen
      setTimeout(() => {
        confirmMessage.delete().catch(console.error);
      }, 2 * 24 * 60 * 60 * 1000); // 2 Tage in Millisekunden
    } else if (result.toLowerCase().includes("already")) {
      await message.edit({
        embeds: [createEmbed(
          '> Bereits auf der Whitelist', 
          config.messages.already_whitelisted.replace('{minecraft_name}', minecraftName),
          config.colors.accent
        )]
      });
    } else {
      await message.edit({
        embeds: [createEmbed(
          '> Fehler beim Whitelist-Vorgang', 
          config.messages.whitelist_error
            .replace('{minecraft_name}', minecraftName)
            .replace('{error}', result),
          config.colors.error
        )]
      });
    }
  } catch (error) {
    logger.error(`Fehler beim Ausführen des Whitelist-Befehls: ${error}`);
    await message.edit({
      embeds: [createEmbed(
        '> Fehler beim Whitelist-Vorgang', 
        config.messages.whitelist_error
          .replace('{minecraft_name}', minecraftName)
          .replace('{error}', error.message),
        config.colors.error
      )]
    });
  }
  
  // Entferne aus den ausstehenden Anfragen
  pendingRequests.delete(message.id);
  logger.info(`Whitelist-Anfrage bearbeitet für ${minecraftName}`);
}

async function handleRejection(message, minecraftName) {
  // Aktualisiere die Nachricht
  await message.edit({
    embeds: [createEmbed(
      '> Whitelist-Anfrage abgelehnt', 
      config.messages.whitelist_rejected.replace('{minecraft_name}', minecraftName),
      config.colors.error
    )]
  });
  
  // Entferne aus den ausstehenden Anfragen
  pendingRequests.delete(message.id);
  logger.info(`Whitelist-Anfrage abgelehnt für ${minecraftName}`);
}
