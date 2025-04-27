const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkPermissions } = require('../../utils/permissions');
const { createEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Stummschaltet einen Nutzer für eine bestimmte Zeit')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Der Nutzer, der stummgeschaltet werden soll')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('dauer')
        .setDescription('Die Dauer der Stummschaltung in Minuten')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10080)) // Max 7 Tage (10080 Minuten)
    .addStringOption(option => 
      option.setName('grund')
        .setDescription('Der Grund für die Stummschaltung')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
  async execute(interaction) {
    try {
      // Check if user has permission to moderate members
      if (!await checkPermissions(interaction.member, 'MODERATE_MEMBERS')) {
        return interaction.reply({ 
          embeds: [createEmbed(
            '> Zugriff verweigert', 
            'Du hast keine Berechtigung, diesen Befehl zu verwenden.',
            config.colors.error
          )],
          ephemeral: true 
        });
      }

      const targetUser = interaction.options.getUser('user');
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!targetMember) {
        return interaction.reply({ 
          embeds: [createEmbed(
            '> Fehler', 
            'Dieser Nutzer ist nicht auf dem Server.',
            config.colors.error
          )],
          ephemeral: true 
        });
      }

      // Check if the targeted user can be timed out
      if (!targetMember.moderatable) {
        return interaction.reply({ 
          embeds: [createEmbed(
            '> Stummschaltung fehlgeschlagen', 
            'Ich kann diesen Nutzer nicht stummschalten. Er hat möglicherweise höhere Berechtigungen als ich.',
            config.colors.error
          )],
          ephemeral: true 
        });
      }

      const durationMinutes = interaction.options.getInteger('dauer');
      const reason = interaction.options.getString('grund') || 'Kein Grund angegeben';
      
      // Convert minutes to milliseconds
      const durationMs = durationMinutes * 60 * 1000;
      
      // Attempt to timeout the user
      await targetMember.timeout(durationMs, reason);
      
      // Log the timeout action
      const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [createEmbed(
            '> Nutzer stummgeschaltet',
            `**Nutzer:** ${targetUser.tag} (${targetUser.id})\n**Dauer:** ${durationMinutes} Minuten\n**Grund:** ${reason}\n**Moderator:** ${interaction.user.tag}`,
            config.colors.accent
          )]
        });
      }
      
      logger.info(`${interaction.user.tag} timed out ${targetUser.tag} for ${durationMinutes} minutes. Reason: ${reason}`);
      
      // Confirm the timeout to the user who issued the command
      return interaction.reply({ 
        embeds: [createEmbed(
          '> Nutzer stummgeschaltet', 
          `${targetUser.tag} wurde erfolgreich für ${durationMinutes} Minuten stummgeschaltet.\n**Grund:** ${reason}`,
          config.colors.success
        )],
        ephemeral: true 
      });
      
    } catch (error) {
      logger.error(`Error executing mute command: ${error}`);
      
      return interaction.reply({ 
        embeds: [createEmbed(
          '> Befehl fehlgeschlagen', 
          'Der Befehl konnte nicht ausgeführt werden. Bitte versuche es später erneut. Wenn das Problem weiterhin besteht, kontaktiere bitte einen Administrator.',
          config.colors.error
        )],
        ephemeral: true 
      });
    }
  },
};
