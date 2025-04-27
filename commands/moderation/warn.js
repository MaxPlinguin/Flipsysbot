const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedBuilder');
const { checkPermissions } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const config = require('../../config');
const fs = require('fs');
const path = require('path');

// Warnungen im Speicher halten
let warnings = new Map();
const warningsFilePath = path.join(__dirname, '..', '..', 'data', 'warnings.json');

// Lade Warnungen aus der Datei, wenn vorhanden
try {
  if (fs.existsSync(warningsFilePath)) {
    const warningsData = JSON.parse(fs.readFileSync(warningsFilePath, 'utf8'));
    warnings = new Map(Object.entries(warningsData));
    logger.info('Warnungen aus Datei geladen');
  }
} catch (error) {
  logger.error(`Fehler beim Laden der Warnungen: ${error}`);
  warnings = new Map();
}

// Speichern der Warnungen in eine Datei
function saveWarnings() {
  try {
    const warningsObj = {};
    warnings.forEach((value, key) => {
      warningsObj[key] = value;
    });
    
    // Stelle sicher, dass das Datenverzeichnis existiert
    const dataDir = path.join(__dirname, '..', '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(warningsFilePath, JSON.stringify(warningsObj, null, 2));
    logger.info('Warnungen in Datei gespeichert');
  } catch (error) {
    logger.error(`Fehler beim Speichern der Warnungen: ${error}`);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Verwarnt einen Nutzer')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Der zu verwarnende Nutzer')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('grund')
        .setDescription('Der Grund für die Verwarnung')
        .setRequired(true))
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
      const reason = interaction.options.getString('grund');
      
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
      
      // Holen des Mitglieds (wichtig für Prüfungen)
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
      
      // Überprüfe, ob der Zielnutzer ein Administrator oder Moderator ist
      if (member.permissions.has(PermissionFlagsBits.Administrator) || 
          member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({ 
          embeds: [createEmbed(
            '> Fehler', 
            'Du kannst keine Administratoren oder Moderatoren verwarnen.',
            config.colors.error
          )],
          ephemeral: true 
        });
      }
      
      // Warnungen für diesen Nutzer abrufen oder neu erstellen
      if (!warnings.has(targetUser.id)) {
        warnings.set(targetUser.id, []);
      }
      
      const userWarnings = warnings.get(targetUser.id);
      
      // Neue Warnung hinzufügen
      userWarnings.push({
        moderator: interaction.user.id,
        reason: reason,
        timestamp: new Date().toISOString()
      });
      
      // Warnungen aktualisieren und speichern
      warnings.set(targetUser.id, userWarnings);
      saveWarnings();
      
      // Den Nutzer über die Warnung informieren
      try {
        await targetUser.send({ 
          embeds: [createEmbed(
            '> Du wurdest verwarnt',
            `Du wurdest auf dem Server **${interaction.guild.name}** verwarnt.\n\n**Grund:** ${reason}\n**Moderator:** ${interaction.user.tag}\n**Warnungen insgesamt:** ${userWarnings.length}`,
            config.colors.error
          )]
        });
      } catch (error) {
        logger.warn(`Konnte ${targetUser.tag} keine DM senden: ${error}`);
      }
      
      // Bestätigung an den Moderator senden
      await interaction.reply({ 
        embeds: [createEmbed(
          '> Nutzer verwarnt', 
          `**Nutzer:** ${targetUser.tag}\n**Grund:** ${reason}\n**Warnungen insgesamt:** ${userWarnings.length}`,
          config.colors.accent
        )]
      });
      
      // Loggen der Warnung
      const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        logChannel.send({ 
          embeds: [createEmbed(
            '> Nutzer verwarnt',
            `**Nutzer:** ${targetUser.tag} (${targetUser.id})\n**Moderator:** ${interaction.user.tag}\n**Grund:** ${reason}\n**Warnungen insgesamt:** ${userWarnings.length}`,
            config.colors.accent
          )]
        });
      }
      
      logger.info(`${targetUser.tag} wurde von ${interaction.user.tag} verwarnt. Grund: ${reason}`);
      
    } catch (error) {
      logger.error(`Fehler beim Ausführen des Warn-Befehls: ${error}`);
      
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