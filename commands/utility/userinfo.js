const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Zeigt Informationen über einen Nutzer an')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Der Nutzer, über den Informationen angezeigt werden sollen')
        .setRequired(false)),

  async execute(interaction) {
    try {
      // Zielperson ist entweder der angegebene Nutzer oder der Befehlsausführer selbst
      const targetUser = interaction.options.getUser('user') || interaction.user;

      // Mitgliedsinformationen abrufen
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!member) {
        return interaction.reply({ 
          embeds: [createEmbed(
            '> Fehler', 
            'Der angegebene Nutzer ist kein Mitglied dieses Servers oder konnte nicht abgerufen werden.',
            config.colors.error
          )],
          ephemeral: true 
        });
      }

      // Berechnet, wie lange der Nutzer bereits Mitglied ist
      const joinedTimestamp = member.joinedTimestamp;
      const createdTimestamp = targetUser.createdTimestamp;

      const joinedDuration = calculateDuration(joinedTimestamp);
      const accountAge = calculateDuration(createdTimestamp);

      // Bestimmt die höchste Rolle
      const roles = member.roles.cache
        .filter(role => role.id !== interaction.guild.id) // @everyone ausschließen
        .sort((a, b) => b.position - a.position)
        .map(role => `<@&${role.id}>`)
        .join(', ') || 'Keine Rollen';

      const highestRole = member.roles.highest.id !== interaction.guild.id 
        ? `<@&${member.roles.highest.id}>`
        : 'Keine';

      // Erstellt die Antwort
      const joinedDate = `<t:${Math.floor(joinedTimestamp / 1000)}:F> (${joinedDuration})`;
      const createdDate = `<t:${Math.floor(createdTimestamp / 1000)}:F> (${accountAge})`;

      await interaction.reply({ 
        ephemeral: true,
        embeds: [createEmbed(
          `> Nutzerinformation: ${targetUser.tag}`, 
          `**ID:** ${targetUser.id}\n**Nickname:** ${member.nickname || 'Keiner'}\n**Beigetreten:** ${joinedDate}\n**Account erstellt:** ${createdDate}\n**Status:** ${member.presence?.status || 'Offline'}\n\n**Höchste Rolle:** ${highestRole}\n\n**Rollen (${member.roles.cache.size - 1}):**\n${roles}`,
          config.colors.primary,
          [],
          { text: `Angefordert von ${interaction.user.tag}` },
          targetUser.displayAvatarURL({ dynamic: true })
        )]
      });

      logger.info(`Userinfo-Befehl für ${targetUser.tag} ausgeführt von ${interaction.user.tag}`);
    } catch (error) {
      logger.error(`Fehler beim Ausführen des Userinfo-Befehls: ${error}`);

      return interaction.reply({ 
        embeds: [createEmbed(
          '> Fehler', 
          'Beim Ausführen des Befehls ist ein Fehler aufgetreten. Bitte versuche es später erneut.',
          config.colors.error
        )],
        ephemeral: true 
      });
    }
  },
};

// Funktion zur Berechnung der Zeitdauer
function calculateDuration(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) {
    return `vor ${years} Jahr${years !== 1 ? 'en' : ''}`;
  } else if (months > 0) {
    return `vor ${months} Monat${months !== 1 ? 'en' : ''}`;
  } else if (days > 0) {
    return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
  } else if (hours > 0) {
    return `vor ${hours} Stunde${hours !== 1 ? 'n' : ''}`;
  } else if (minutes > 0) {
    return `vor ${minutes} Minute${minutes !== 1 ? 'n' : ''}`;
  } else {
    return `vor ${seconds} Sekunde${seconds !== 1 ? 'n' : ''}`;
  }
}