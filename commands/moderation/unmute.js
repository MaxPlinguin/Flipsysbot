const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Hebt die Stummschaltung eines Nutzers auf')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Der Nutzer, dessen Stummschaltung aufgehoben werden soll')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('grund')
        .setDescription('Der Grund für die Aufhebung der Stummschaltung')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
  async execute(interaction) {
    try {
      // Berechtigung prüfen
      if (!await checkPermissions(interaction.member, 'MODERATE_MEMBERS')) {
        return interaction.reply({ 
          embeds: [createEmbed(
            '> Keine Berechtigung', 
            'Du hast keine Berechtigung, diesen Befehl zu verwenden.',
            config.colors.error
          )],
          ephemeral: true 
        });
      }
      
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('grund') || 'Kein Grund angegeben';
      
      if (!targetUser) {
        return interaction.reply({ 
          embeds: [createEmbed(
            '> Fehler', 
            'Der angegebene Nutzer wurde nicht gefunden.',
            config.colors.error
          )],
          ephemeral: true 
        });
      }
      
      // Holen des Mitglieds
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!member) {
        return interaction.reply({ 
          embeds: [createEmbed(
            '> Fehler', 
            'Der Nutzer ist kein Mitglied dieses Servers.',
            config.colors.error
          )],
          ephemeral: true 
        });
      }
      
      // Überprüfen, ob der Nutzer überhaupt stummgeschaltet ist
      if (!member.communicationDisabledUntil) {
        return interaction.reply({ 
          embeds: [createEmbed(
            '> Fehler', 
            'Dieser Nutzer ist nicht stummgeschaltet.',
            config.colors.error
          )],
          ephemeral: true 
        });
      }
      
      // Stummschaltung aufheben
      await member.timeout(null, `Aufgehoben von ${interaction.user.tag}: ${reason}`);
      
      // Den Nutzer informieren
      try {
        await targetUser.send({ 
          embeds: [createEmbed(
            '> Stummschaltung aufgehoben',
            `Deine Stummschaltung auf dem Server **${interaction.guild.name}** wurde aufgehoben.\n\n**Grund:** ${reason}\n**Moderator:** ${interaction.user.tag}`,
            config.colors.success
          )]
        });
      } catch (error) {
        logger.warn(`Konnte ${targetUser.tag} keine DM senden: ${error}`);
      }
      
      // Bestätigung an den Moderator senden
      await interaction.reply({ 
        embeds: [createEmbed(
          '> Stummschaltung aufgehoben', 
          `**Nutzer:** ${targetUser.tag}\n**Grund:** ${reason}`,
          config.colors.success
        )]
      });
      
      // Loggen der Aufhebung
      const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        logChannel.send({ 
          embeds: [createEmbed(
            '> Stummschaltung aufgehoben',
            `**Nutzer:** ${targetUser.tag} (${targetUser.id})\n**Moderator:** ${interaction.user.tag}\n**Grund:** ${reason}`,
            config.colors.success
          )]
        });
      }
      
      logger.info(`Die Stummschaltung von ${targetUser.tag} wurde von ${interaction.user.tag} aufgehoben. Grund: ${reason}`);
      
    } catch (error) {
      logger.error(`Fehler beim Ausführen des Unmute-Befehls: ${error}`);
      
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