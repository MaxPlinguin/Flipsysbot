const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkPermissions } = require('../../utils/permissions');
const { createEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('Bannt einen Nutzer temporär vom Server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Der temporär zu bannende Nutzer')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('dauer')
        .setDescription('Dauer des Banns in Tagen')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(30))
    .addStringOption(option => 
      option.setName('grund')
        .setDescription('Der Grund für den Bann')
        .setRequired(false))
    .addIntegerOption(option => 
      option.setName('nachrichtendauer')
        .setDescription('Anzahl der Tage, deren Nachrichten gelöscht werden sollen (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
  async execute(interaction) {
    try {
      // Check if user has permission to ban
      if (!await checkPermissions(interaction.member, 'BAN_MEMBERS')) {
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
      
      // If the user is in the server, check if they can be banned
      if (targetMember && !targetMember.bannable) {
        return interaction.reply({ 
          embeds: [createEmbed(
            '> Temporärer Bann fehlgeschlagen', 
            'Ich kann diesen Nutzer nicht bannen. Er hat möglicherweise höhere Berechtigungen als ich.',
            config.colors.error
          )],
          ephemeral: true 
        });
      }

      const duration = interaction.options.getInteger('dauer');
      const reason = interaction.options.getString('grund') || 'Kein Grund angegeben';
      const deleteDays = interaction.options.getInteger('nachrichtendauer') || 0;
      
      // Calculate the unban date
      const unbanDate = new Date();
      unbanDate.setDate(unbanDate.getDate() + duration);
      
      // Store temp ban info for tracking (in a real system, this would go to a database)
      const tempBanInfo = {
        userId: targetUser.id,
        unbanDate: unbanDate.getTime(),
        guildId: interaction.guild.id,
        bannedBy: interaction.user.id,
        reason: reason
      };
      
      // In a production environment, you would store this in a database
      // Here we'll just store it in memory (note: this will be lost on restart)
      if (!global.tempBans) global.tempBans = [];
      global.tempBans.push(tempBanInfo);
      
      // Set timeout to unban the user (this will be lost on restart in this simple implementation)
      // In production, you would use a persistent solution
      setTimeout(async () => {
        try {
          await interaction.guild.members.unban(targetUser.id, 'Temporärer Bann abgelaufen');
          logger.info(`Nutzer ${targetUser.tag} wurde nach ${duration} Tagen automatisch entbannt`);
          
          // Log the unban action
          const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
          if (logChannel) {
            logChannel.send({
              embeds: [createEmbed(
                '> Nutzer automatisch entbannt',
                `**Nutzer:** ${targetUser.tag} (${targetUser.id})\n**Grund:** Temporärer Bann (${duration} Tage) abgelaufen\n**Ursprünglicher Grund:** ${reason}`,
                config.colors.secondary
              )]
            });
          }
        } catch (unbanError) {
          logger.error(`Konnte den Nutzer ${targetUser.id} nicht automatisch entbannen: ${unbanError}`);
        }
      }, duration * 24 * 60 * 60 * 1000); // Convert days to milliseconds
      
      // Attempt to ban the user
      await interaction.guild.members.ban(targetUser, { 
        deleteMessageDays: deleteDays,
        reason: `[Temp-Bann ${duration} Tage] ${reason}`
      });
      
      // Log the ban action
      const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [createEmbed(
            '> Nutzer temporär gebannt',
            `**Nutzer:** ${targetUser.tag} (${targetUser.id})\n**Dauer:** ${duration} Tage\n**Entbannungsdatum:** ${unbanDate.toLocaleString()}\n**Grund:** ${reason}\n**Nachrichtenlöschung:** ${deleteDays} Tage\n**Moderator:** ${interaction.user.tag}`,
            config.colors.accent
          )]
        });
      }
      
      logger.info(`${interaction.user.tag} hat ${targetUser.tag} für ${duration} Tage temporär gebannt. Grund: ${reason}`);
      
      // Confirm the ban to the user who issued the command
      return interaction.reply({ 
        embeds: [createEmbed(
          '> Nutzer temporär gebannt', 
          `${targetUser.tag} wurde erfolgreich für ${duration} Tage gebannt.\n**Entbannungsdatum:** ${unbanDate.toLocaleString()}\n**Grund:** ${reason}\n**Nachrichtenlöschung:** ${deleteDays} Tage`,
          config.colors.success
        )],
        ephemeral: true 
      });
      
    } catch (error) {
      logger.error(`Fehler beim Ausführen des tempban-Befehls: ${error}`);
      
      return interaction.reply({ 
        embeds: [createEmbed(
          '> Befehl fehlgeschlagen', 
          'Dieser Befehl konnte nicht ausgeführt werden. Bitte versuche es später erneut. Wenn das Problem weiterhin besteht, kontaktiere bitte einen Administrator.',
          config.colors.error
        )],
        ephemeral: true 
      });
    }
  },
};