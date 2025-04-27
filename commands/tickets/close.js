const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const config = require('../../config');
const { closeTicket } = require('../../systems/ticketSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('closeticket')
    .setDescription('Closes the current ticket')
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for closing the ticket')
        .setRequired(false)),
    
  async execute(interaction) {
    try {
      // Check if the command is being used in a ticket channel
      const ticketData = await closeTicket(interaction.channel, interaction.user, interaction.options.getString('reason'));
      
      if (!ticketData) {
        return interaction.reply({ 
          embeds: [createEmbed(
            '> Not a Ticket', 
            'This command can only be used in ticket channels.',
            config.colors.error
          )],
          ephemeral: true 
        });
      }
      
      // The ticket will be closed by the closeTicket function
      // Just inform the user that the command was received
      return interaction.reply({ 
        embeds: [createEmbed(
          '> Closing Ticket', 
          'This ticket will be closed shortly.',
          config.colors.primary
        )],
        ephemeral: true 
      });
      
    } catch (error) {
      logger.error(`Error executing closeticket command: ${error}`);
      
      return interaction.reply({ 
        embeds: [createEmbed(
          '> Command Failed', 
          'This command could not be executed. Please try again later. If the problem persists, please contact an admin.',
          config.colors.error
        )],
        ephemeral: true 
      });
    }
  },
};
