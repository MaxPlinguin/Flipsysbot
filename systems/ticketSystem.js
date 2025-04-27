const fs = require('fs');
const path = require('path');
const { 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  Collection,
  StringSelectMenuBuilder
} = require('discord.js');
const { createEmbed } = require('../utils/embedBuilder');
const logger = require('../utils/logger');
const config = require('../config');

// In-memory ticket storage (will be saved to a file for persistence)
let tickets = new Collection();
const ticketsFilePath = path.join(__dirname, '..', 'data', 'tickets.json');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load tickets from file if it exists
if (fs.existsSync(ticketsFilePath)) {
  try {
    const ticketData = JSON.parse(fs.readFileSync(ticketsFilePath, 'utf8'));
    tickets = new Collection(Object.entries(ticketData));
    logger.info('Loaded tickets from file');
  } catch (error) {
    logger.error(`Error loading tickets: ${error}`);
    tickets = new Collection();
  }
} else {
  logger.info('No tickets file found, starting with empty collection');
}

// Save tickets to file
function saveTickets() {
  try {
    const ticketObject = {};
    tickets.forEach((value, key) => {
      ticketObject[key] = value;
    });
    
    fs.writeFileSync(ticketsFilePath, JSON.stringify(ticketObject, null, 2));
    logger.info('Saved tickets to file');
  } catch (error) {
    logger.error(`Error saving tickets: ${error}`);
  }
}

/**
 * Handles the create ticket button click
 * @param {ButtonInteraction} interaction - The interaction that triggered this
 */
async function handleTicketButton(interaction) {
  try {
    // Create a modal for the ticket
    const modal = new ModalBuilder()
      .setCustomId('ticket_modal')
      .setTitle('Support-Ticket erstellen');
      
    // Add form inputs for the ticket
    const ingameNameInput = new TextInputBuilder()
      .setCustomId('ingameName')
      .setLabel('Dein Minecraft Benutzername')
      .setPlaceholder('Gib deinen Minecraft Benutzernamen ein')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
      
    const titleInput = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Kurzer Titel (max. 10 Wörter)')
      .setPlaceholder('Kurzer Titel für dein Ticket')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true);
      
    const categoryInput = new TextInputBuilder()
      .setCustomId('category')
      .setLabel('Kategorie')
      .setPlaceholder(`Wähle aus: ${config.ticketCategories.join(', ')}`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
      
    const descriptionInput = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Problembeschreibung')
      .setPlaceholder('Bitte beschreibe dein Problem ausführlich')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);
      
    // Create action rows for each input
    const firstRow = new ActionRowBuilder().addComponents(ingameNameInput);
    const secondRow = new ActionRowBuilder().addComponents(titleInput);
    const thirdRow = new ActionRowBuilder().addComponents(categoryInput);
    const fourthRow = new ActionRowBuilder().addComponents(descriptionInput);
    
    // Add inputs to the modal
    modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);
    
    // Show the modal to the user
    await interaction.showModal(modal);
    
  } catch (error) {
    logger.error(`Error handling ticket button: ${error}`);
    
    await interaction.reply({ 
      embeds: [createEmbed(
        '> Fehler beim Erstellen des Tickets', 
        'Beim Erstellen des Tickets ist ein Fehler aufgetreten. Bitte versuche es später erneut.',
        config.colors.error
      )],
      ephemeral: true 
    });
  }
}

/**
 * Handles the ticket modal submission
 * @param {ModalSubmitInteraction} interaction - The interaction that triggered this
 */
async function handleTicketModal(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });
    
    // Get values from the modal
    const ingameName = interaction.fields.getTextInputValue('ingameName');
    const title = interaction.fields.getTextInputValue('title');
    const category = interaction.fields.getTextInputValue('category');
    const description = interaction.fields.getTextInputValue('description');
    
    // Validate category
    if (!config.ticketCategories.includes(category)) {
      return interaction.editReply({ 
        embeds: [createEmbed(
          '> Ungültige Kategorie', 
          `Bitte wähle aus diesen Kategorien: ${config.ticketCategories.join(', ')}`,
          config.colors.error
        )]
      });
    }
    
    // Create a unique channel name for the ticket
    const channelName = `ticket-${interaction.user.username.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    
    // Create the ticket channel with proper permissions
    const permissionOverwrites = [
      {
        id: interaction.guild.id, // @everyone role
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.client.user.id, // Bot
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      },
      {
        id: interaction.user.id, // Ticket creator
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      }
    ];
    
    // Add admin role permissions if available
    if (config.adminRoleId && config.adminRoleId !== 'YOUR_ADMIN_ROLE_ID') {
      permissionOverwrites.push({
        id: config.adminRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      });
    }
    
    // Add moderator role permissions if available
    if (config.moderatorRoleId && config.moderatorRoleId !== 'YOUR_MODERATOR_ROLE_ID') {
      permissionOverwrites.push({
        id: config.moderatorRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      });
    }
    
    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: permissionOverwrites
    });
    
    // Store ticket information
    const ticketData = {
      channelId: ticketChannel.id,
      userId: interaction.user.id,
      ingameName: ingameName,
      title: title,
      category: category,
      description: description,
      createdAt: new Date().toISOString(),
      status: 'open'
    };
    
    tickets.set(ticketChannel.id, ticketData);
    saveTickets();
    
    // Create close ticket button
    const closeButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Ticket schließen')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒')
      );
    
    // Send initial message in the ticket channel
    let notifyContent = `<@${interaction.user.id}>`;
    
    // Add admin and moderator role pings if available
    if (config.adminRoleId && config.adminRoleId !== 'YOUR_ADMIN_ROLE_ID') {
      notifyContent += ` <@&${config.adminRoleId}>`;
    }
    if (config.moderatorRoleId && config.moderatorRoleId !== 'YOUR_MODERATOR_ROLE_ID') {
      notifyContent += ` <@&${config.moderatorRoleId}>`;
    }
    
    await ticketChannel.send({ 
      content: notifyContent,
      embeds: [createEmbed(
        `> 𝐅𝐥𝐢𝐩𝐬𝐲 Support Ticket`,
        `Ein neues Ticket wurde von ${interaction.user.tag} erstellt.\n\n**Minecraft Benutzername:** ${ingameName}\n**Kategorie:** ${category}\n**Titel:** ${title}\n\n**Beschreibung:**\n${description}\n\n*Bitte warte geduldig, bis ein Teammitglied dir hilft.*`,
        config.colors.primary
      )],
      components: [closeButton]
    });
    
    // Log the ticket creation
    logger.info(`Ticket created by ${interaction.user.tag} (${interaction.user.id}) - Channel: ${ticketChannel.name}`);
    
    // Send confirmation to the user
    return interaction.editReply({ 
      embeds: [createEmbed(
        '> Ticket erstellt', 
        `Dein Ticket wurde erstellt! Bitte gehe zu ${ticketChannel}, um das Gespräch fortzusetzen.`,
        config.colors.success
      )]
    });
    
  } catch (error) {
    logger.error(`Error handling ticket modal: ${error}`);
    
    return interaction.editReply({ 
      embeds: [createEmbed(
        '> Fehler beim Erstellen des Tickets', 
        'Beim Erstellen des Tickets ist ein Fehler aufgetreten. Bitte versuche es später erneut.',
        config.colors.error
      )]
    });
  }
}

/**
 * Handles the close ticket button click
 * @param {ButtonInteraction} interaction - The interaction that triggered this
 */
async function handleCloseTicketButton(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });
    
    const ticketData = await closeTicket(interaction.channel, interaction.user);
    
    if (!ticketData) {
      return interaction.editReply({ 
        embeds: [createEmbed(
          '> Kein Ticket', 
          'Dieser Kanal ist kein Ticket-Kanal.',
          config.colors.error
        )]
      });
    }
    
    return interaction.editReply({ 
      embeds: [createEmbed(
        '> Ticket geschlossen', 
        'Dieses Ticket wurde geschlossen und wird in Kürze gelöscht.',
        config.colors.success
      )]
    });
    
  } catch (error) {
    logger.error(`Error handling close ticket button: ${error}`);
    
    return interaction.editReply({ 
      embeds: [createEmbed(
        '> Fehler beim Schließen des Tickets', 
        'Beim Schließen des Tickets ist ein Fehler aufgetreten. Bitte versuche es später erneut.',
        config.colors.error
      )]
    });
  }
}

/**
 * Closes a ticket
 * @param {TextChannel} channel - The ticket channel
 * @param {User} closedBy - The user who closed the ticket
 * @param {string} [reason] - The reason for closing the ticket
 * @returns {Object|null} - The ticket data or null if not a ticket
 */
async function closeTicket(channel, closedBy, reason = 'Kein Grund angegeben') {
  try {
    // Check if this is a ticket channel
    const ticketData = tickets.get(channel.id);
    if (!ticketData) {
      return null;
    }
    
    // Update ticket status
    ticketData.status = 'closed';
    ticketData.closedAt = new Date().toISOString();
    ticketData.closedBy = closedBy.id;
    ticketData.closeReason = reason;
    
    tickets.set(channel.id, ticketData);
    saveTickets();
    
    // Send closing message
    await channel.send({ 
      embeds: [createEmbed(
        '> Ticket geschlossen', 
        `Dieses Ticket wurde von ${closedBy.tag} geschlossen.\n**Grund:** ${reason}\n\nDer Kanal wird in 10 Sekunden gelöscht.`,
        config.colors.accent
      )]
    });
    
    // Log the ticket closure
    const logChannel = channel.guild.channels.cache.get(config.logChannelId);
    if (logChannel) {
      logChannel.send({
        embeds: [createEmbed(
          '> Ticket geschlossen',
          `**Ticket:** ${channel.name}\n**Geschlossen von:** ${closedBy.tag}\n**Grund:** ${reason}\n**Erstellt von:** <@${ticketData.userId}>\n**Minecraft Name:** ${ticketData.ingameName}\n**Kategorie:** ${ticketData.category}\n**Titel:** ${ticketData.title}\n**Erstellt am:** ${new Date(ticketData.createdAt).toLocaleString()}`,
          config.colors.accent
        )]
      });
    }
    
    // Wait 10 seconds and then delete the channel
    setTimeout(async () => {
      try {
        await channel.delete();
        logger.info(`Ticket channel ${channel.name} deleted`);
      } catch (error) {
        logger.error(`Error deleting ticket channel: ${error}`);
      }
    }, 10000);
    
    return ticketData;
    
  } catch (error) {
    logger.error(`Error closing ticket: ${error}`);
    return null;
  }
}

module.exports = {
  handleTicketButton,
  handleTicketModal,
  handleCloseTicketButton,
  closeTicket,
  tickets
};
