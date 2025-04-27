const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { checkPermissions } = require('../../utils/permissions');
const { createEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketsetup')
    .setDescription('Sets up the ticket system')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel to set up the ticket system in')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  async execute(interaction) {
    try {
      // Check if user has permission
      if (!await checkPermissions(interaction.member, 'ADMINISTRATOR')) {
        return interaction.reply({ 
          embeds: [createEmbed(
            '> Zugriff verweigert', 
            'Du hast keine Berechtigung, diesen Befehl zu verwenden.',
            config.colors.error
          )],
          ephemeral: true 
        });
      }

      const channel = interaction.options.getChannel('channel');
      
      // Create the ticket panel embed
      const ticketEmbed = createEmbed(
        '> 𝐅𝐥𝐢𝐩𝐬𝐲 Support Tickets',
        'Brauchst du Hilfe? Möchtest du etwas melden? Erstelle ein Ticket und unser Team wird dir so schnell wie möglich helfen!\n\nKlicke auf den Button unten, um ein neues Ticket zu erstellen.',
        config.colors.primary
      );
      
      // Create the button for opening tickets
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel('Ticket erstellen')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫')
        );
      
      // Send the ticket panel to the specified channel
      await channel.send({
        embeds: [ticketEmbed],
        components: [row]
      });
      
      // Log the setup
      logger.info(`${interaction.user.tag} set up the ticket system in channel #${channel.name}`);
      
      return interaction.reply({ 
        embeds: [createEmbed(
          '> Ticket-System eingerichtet', 
          `Das Ticket-System wurde erfolgreich in ${channel} eingerichtet.`,
          config.colors.success
        )],
        ephemeral: true 
      });
      
    } catch (error) {
      logger.error(`Error executing ticketsetup command: ${error}`);
      
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
