const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const config = require('../../config');
const { isValidMinecraftUsername } = require('../../minecraft');

// Speichert die ausstehenden Whitelist-Anfragen: {message_id: {userId, minecraftName, action}}
const pendingRequests = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Füge einen Spieler zur Minecraft-Server-Whitelist hinzu')
    .addStringOption(option => 
      option.setName('spielername')
        .setDescription('Der Minecraft-Benutzername')
        .setRequired(true)),
    
  async execute(interaction) {
    try {
      // Prüfen, ob der Befehl im erlaubten Channel verwendet wird
      if (interaction.channelId !== '1362092104070729932') {
        return interaction.reply({ 
          embeds: [createEmbed(
            '> Falscher Kanal', 
            'Dieser Befehl kann nur im Whitelist-Kanal verwendet werden.',
            config.colors.error
          )],
          ephemeral: true 
        });
      }
      
      // Spielername aus den Optionen abrufen
      const minecraftName = interaction.options.getString('spielername');
      
      // Gültigkeit des Benutzernamens prüfen
      if (!isValidMinecraftUsername(minecraftName)) {
        return interaction.reply({ 
          embeds: [createEmbed(
            '> Ungültiger Benutzername', 
            config.messages.invalid_username.replace('{minecraft_name}', minecraftName),
            config.colors.error
          )],
          ephemeral: true 
        });
      }
      
      // Benutzeranfrage bestätigen
      await interaction.reply({ 
        embeds: [createEmbed(
          '> Anfrage wird bearbeitet', 
          `Deine Anfrage für \`${minecraftName}\` wird bearbeitet...`,
          config.colors.accent
        )],
        ephemeral: true 
      });
      
      // Admin-Kanal abrufen
      const adminChannel = interaction.client.channels.cache.get(config.adminChannelId);
      
      if (!adminChannel) {
        logger.error(`Admin-Kanal mit ID ${config.adminChannelId} nicht gefunden`);
        return;
      }
      
      // Erstelle eine Nachricht im Admin-Kanal
      const requestMessage = await adminChannel.send({
        embeds: [createEmbed(
          '> Whitelist-Anfrage', 
          config.messages.whitelist_request
            .replace('{user}', interaction.user.toString())
            .replace('{minecraft_name}', minecraftName),
          config.colors.primary
        )]
      });
      
      // Füge Reaktionen für Genehmigung/Ablehnung hinzu
      await requestMessage.react('✅');
      await requestMessage.react('❌');
      
      // Speichere die ausstehende Anfrage
      pendingRequests.set(requestMessage.id, {
        userId: interaction.user.id,
        minecraftName: minecraftName,
        action: 'add'
      });
      
      logger.info(`Whitelist-Anfrage erstellt für ${minecraftName} von ${interaction.user.tag}`);
      
    } catch (error) {
      logger.error(`Fehler beim Ausführen des whitelist-Befehls: ${error}`);
      
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
  
  // Exportiere die pendingRequests-Map für den Zugriff von außen
  pendingRequests
};