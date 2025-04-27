const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const config = require('../../config');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Zeigt eine Übersicht aller Befehle an')
    .addStringOption(option => 
      option.setName('kategorie')
        .setDescription('Die Kategorie, für die Befehle angezeigt werden sollen')
        .setRequired(false)
        .addChoices(
          { name: 'Moderation', value: 'moderation' },
          { name: 'Tickets', value: 'tickets' },
          { name: 'Utility', value: 'utility' }
        )),
    
  async execute(interaction) {
    try {
      const selectedCategory = interaction.options.getString('kategorie');
      
      // Sammle alle Befehle aus den Unterordnern und prüfe Berechtigungen
      const commands = await loadCommands();
      const member = interaction.member;
      
      // Wenn eine Kategorie ausgewählt wurde, zeige nur diese an
      if (selectedCategory) {
        let categoryCommands = commands[selectedCategory];
        
        // Filtere die Befehle nach Berechtigungen
        categoryCommands = await Promise.all(categoryCommands.map(async cmd => {
          const hasPermission = await checkPermissions(member, cmd.name);
          return hasPermission ? cmd : null;
        }));
        
        // Entferne null-Werte (keine Berechtigung)
        categoryCommands = categoryCommands.filter(cmd => cmd !== null);
        
        if (!categoryCommands || categoryCommands.length === 0) {
          return interaction.reply({ 
            embeds: [createEmbed(
              '> Fehler', 
              'Diese Kategorie enthält keine Befehle oder existiert nicht.',
              config.colors.error
            )],
            ephemeral: true 
          });
        }
        
        // Erstelle eine formatierte Liste der Befehle für diese Kategorie
        let commandList = '';
        categoryCommands.forEach(cmd => {
          commandList += `**/${cmd.name}** - ${cmd.description}\n`;
        });
        
        return interaction.reply({ 
          embeds: [createEmbed(
            `> ${capitalizeFirstLetter(selectedCategory)}-Befehle`, 
            commandList,
            config.colors.primary
          )],
          ephemeral: true
        });
      }
      
      // Andernfalls zeige eine Übersicht aller Kategorien
      let fields = [];
      
      for (const [category, cmds] of Object.entries(commands)) {
        // Filtere die Befehle nach Berechtigungen
        const availableCommands = await Promise.all(cmds.map(async cmd => {
          const hasPermission = await checkPermissions(member, cmd.name);
          return hasPermission ? cmd : null;
        }));
        
        const filteredCommands = availableCommands.filter(cmd => cmd !== null);
        
        if (filteredCommands.length > 0) {
          // Erstelle eine kurze Beschreibung der Kategorie
          let categoryDesc = '';
          
          switch (category) {
            case 'moderation':
              categoryDesc = 'Befehle zur Verwaltung und Moderation des Servers';
              break;
            case 'tickets':
              categoryDesc = 'Befehle zur Verwaltung des Ticket-Systems';
              break;
            case 'utility':
              categoryDesc = 'Nützliche Befehle für alle Nutzer';
              break;
            default:
              categoryDesc = 'Sonstige Befehle';
          }
          
          fields.push({
            name: `🔹 ${capitalizeFirstLetter(category)} (${cmds.length})`,
            value: `${categoryDesc}\nVerwende \`/help ${category}\` für Details`
          });
        }
      }
      
      await interaction.reply({ 
        embeds: [createEmbed(
          '> 𝐅𝐥𝐢𝐩𝐬𝐲 Bot Hilfe', 
          'Hier findest du eine Übersicht aller verfügbaren Befehle.\nVerwende die Befehle mit einem Schrägstrich (/), um sie auszuführen.',
          config.colors.primary,
          fields,
          { text: `Angefordert von ${interaction.user.tag} • Verwende /help [kategorie] für mehr Details` }
        )],
        ephemeral: true
      });
      
      logger.info(`Help-Befehl ausgeführt von ${interaction.user.tag}`);
    } catch (error) {
      logger.error(`Fehler beim Ausführen des Help-Befehls: ${error}`);
      
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

/**
 * Lädt alle Befehle aus den Unterordnern
 * @returns {Object} - Ein Objekt mit den Befehlen, gruppiert nach Kategorie
 */
async function loadCommands() {
  const commands = {};
  const commandsPath = path.join(__dirname, '../');
  
  // Lese alle Ordner im commands-Verzeichnis
  const folders = fs.readdirSync(commandsPath);
  
  for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder);
    
    // Überprüfe, ob es sich um ein Verzeichnis handelt
    if (fs.statSync(folderPath).isDirectory()) {
      commands[folder] = [];
      
      // Lese alle Dateien im Ordner
      const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
      
      for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        
        if (command.data) {
          commands[folder].push({
            name: command.data.name,
            description: command.data.description
          });
        }
      }
    }
  }
  
  return commands;
}

/**
 * Macht den ersten Buchstaben eines Strings groß
 * @param {string} string - Der String
 * @returns {string} - Der String mit großem Anfangsbuchstaben
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}