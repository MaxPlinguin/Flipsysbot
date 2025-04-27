const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Zeigt die Bot-Latenz an'),
    
  async execute(interaction) {
    try {
      // Berechnet die Latenz
      const sent = await interaction.reply({ 
        embeds: [createEmbed(
          '> Ping wird berechnet...', 
          'Bitte warten...',
          config.colors.primary
        )],
        ephemeral: true,
        fetchReply: true 
      });
      
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      const apiLatency = Math.round(interaction.client.ws.ping);
      
      // Bestimmt die Farbe basierend auf der Latenz
      let color = config.colors.success;
      let status = 'Ausgezeichnet';
      
      if (latency > 300) {
        color = config.colors.error;
        status = 'Schlecht';
      } else if (latency > 150) {
        color = config.colors.accent;
        status = 'Mittel';
      }
      
      // Sendet das Ergebnis
      await interaction.editReply({ 
        embeds: [createEmbed(
          '> 𝐅𝐥𝐢𝐩𝐬𝐲 Ping', 
          `**Bot-Latenz:** ${latency}ms\n**API-Latenz:** ${apiLatency}ms\n**Status:** ${status}`,
          color
        )]
      });
      
      logger.info(`Ping-Befehl ausgeführt: Bot-Latenz: ${latency}ms, API-Latenz: ${apiLatency}ms`);
    } catch (error) {
      logger.error(`Fehler beim Ausführen des Ping-Befehls: ${error}`);
      
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