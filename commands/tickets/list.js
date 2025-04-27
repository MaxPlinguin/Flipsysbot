const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const config = require('../../config');
const { tickets } = require('../../systems/ticketSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket-Befehle')
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Zeigt eine Liste der offenen Tickets an'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('assign')
        .setDescription('Weist ein Ticket einem Moderator zu')
        .addUserOption(option => 
          option.setName('moderator')
            .setDescription('Der Moderator, dem das Ticket zugewiesen werden soll')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('claim')
        .setDescription('Beansprucht ein Ticket für sich selbst'))
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
      
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'list') {
        // Filter nur offene Tickets
        const openTickets = Array.from(tickets.values()).filter(ticket => ticket.status === 'open');
        
        if (openTickets.length === 0) {
          return interaction.reply({ 
            embeds: [createEmbed(
              '> Keine offenen Tickets', 
              'Es gibt derzeit keine offenen Tickets.',
              config.colors.primary
            )],
            ephemeral: true 
          });
        }
        
        // Erstelle eine formatierte Liste der Tickets
        let ticketList = '';
        openTickets.forEach((ticket, index) => {
          const channel = interaction.guild.channels.cache.get(ticket.channelId);
          const channelMention = channel ? `<#${channel.id}>` : '(Kanal nicht gefunden)';
          const createdDate = new Date(ticket.createdAt).toLocaleString();
          
          ticketList += `**${index + 1}.** ${channelMention}\n`;
          ticketList += `   **Titel:** ${ticket.title}\n`;
          ticketList += `   **Kategorie:** ${ticket.category}\n`;
          ticketList += `   **Erstellt von:** <@${ticket.userId}>\n`;
          ticketList += `   **Minecraft-Name:** ${ticket.ingameName}\n`;
          ticketList += `   **Erstellt am:** ${createdDate}\n`;
          
          if (ticket.assignedTo) {
            ticketList += `   **Zugewiesen an:** <@${ticket.assignedTo}>\n`;
          }
          
          ticketList += '\n';
        });
        
        return interaction.reply({ 
          embeds: [createEmbed(
            `> Offene Tickets (${openTickets.length})`, 
            ticketList,
            config.colors.primary
          )],
          ephemeral: true 
        });
      } 
      else if (subcommand === 'assign') {
        // Überprüfe, ob der aktuelle Kanal ein Ticket ist
        const ticketData = tickets.get(interaction.channel.id);
        
        if (!ticketData) {
          return interaction.reply({ 
            embeds: [createEmbed(
              '> Kein Ticket', 
              'Dieser Kanal ist kein Ticket-Kanal. Führe diesen Befehl in einem Ticket-Kanal aus.',
              config.colors.error
            )],
            ephemeral: true 
          });
        }
        
        const moderator = interaction.options.getUser('moderator');
        
        // Aktualisiere die Ticket-Daten
        ticketData.assignedTo = moderator.id;
        tickets.set(interaction.channel.id, ticketData);
        
        // Informiere den Kanal
        await interaction.reply({ 
          embeds: [createEmbed(
            '> Ticket zugewiesen', 
            `Dieses Ticket wurde ${moderator} zugewiesen.`,
            config.colors.success
          )]
        });
        
        logger.info(`Ticket ${interaction.channel.name} wurde ${moderator.tag} von ${interaction.user.tag} zugewiesen`);
      }
      else if (subcommand === 'claim') {
        // Überprüfe, ob der aktuelle Kanal ein Ticket ist
        const ticketData = tickets.get(interaction.channel.id);
        
        if (!ticketData) {
          return interaction.reply({ 
            embeds: [createEmbed(
              '> Kein Ticket', 
              'Dieser Kanal ist kein Ticket-Kanal. Führe diesen Befehl in einem Ticket-Kanal aus.',
              config.colors.error
            )],
            ephemeral: true 
          });
        }
        
        // Aktualisiere die Ticket-Daten
        ticketData.assignedTo = interaction.user.id;
        tickets.set(interaction.channel.id, ticketData);
        
        // Informiere den Kanal
        await interaction.reply({ 
          embeds: [createEmbed(
            '> Ticket beansprucht', 
            `${interaction.user} hat dieses Ticket beansprucht und wird sich darum kümmern.`,
            config.colors.success
          )]
        });
        
        logger.info(`Ticket ${interaction.channel.name} wurde von ${interaction.user.tag} beansprucht`);
      }
      
    } catch (error) {
      logger.error(`Fehler beim Ausführen des Ticket-Befehls: ${error}`);
      
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