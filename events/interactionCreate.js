
const { InteractionType } = require('discord.js');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { createEmbed } = require('../utils/embedBuilder');
const config = require('../config');

// Ticket-System-Funktionen importieren
const { handleTicketButton, handleTicketModal, handleCloseTicketButton } = require('../systems/ticketSystem');

// Hack-Game-Funktionalität vorübergehend entfernt
// const { players } = require('../commands/utility/game');
// const SYMBOLS = ['⬆️', '⬇️', '⬅️', '➡️'];

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      if (interaction.type === InteractionType.ApplicationCommand) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        try {
          logger.info(`User ${interaction.user.username} executed command ${interaction.commandName}`);
          await command.execute(interaction);
        } catch (error) {
          logger.error(`Error handling interaction: ${error}`);
          await interaction.reply({ 
            content: 'Es ist ein Fehler aufgetreten.',
            ephemeral: true 
          });
        }
      } 
      else if (interaction.isButton()) {
        logger.info(`Button-Interaktion erkannt: ${interaction.customId}`);
        
        // Ticket-System-Buttons verarbeiten
        if (interaction.customId === 'create_ticket') {
          await handleTicketButton(interaction);
        } 
        else if (interaction.customId === 'close_ticket') {
          await handleCloseTicketButton(interaction);
        } 
        // Hack-Game-Funktionalität vorübergehend deaktiviert
        else if (interaction.customId === 'hack_action' || 
                 interaction.customId === 'hide_action' || 
                 interaction.customId.startsWith('sequence_')) {
          await interaction.reply({
            content: "Diese Funktion ist derzeit nicht verfügbar.",
            ephemeral: true
          });
        }
      }
      // ModalSubmit-Interaktionen verarbeiten (für Ticket-Modal)
      else if (interaction.isModalSubmit() && interaction.customId === 'ticket_modal') {
        await handleTicketModal(interaction);
      }
    } catch (error) {
      logger.error(`Error in interactionCreate: ${error}`);
    }
  }
};
