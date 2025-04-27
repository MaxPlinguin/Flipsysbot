/**
 * Setup-Skript für den Flipsy Discord-Bot
 * 
 * Dieses Skript hilft bei der Ersteinrichtung des Bots nach einer Installation.
 * Es prüft Abhängigkeiten, erstellt Verzeichnisse und hilft bei der Konfiguration.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const logger = require('./utils/logger');

// Erstelle einen readline-Interface für die Benutzerinteraktion
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Zu erstellende Ordner
const FOLDERS_TO_CREATE = [
  './data',
  './logs'
];

// Hauptfunktion
async function setup() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║             𝐅𝐥𝐢𝐩𝐬𝐲 Discord Bot - Setup                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Prüfe, ob Node.js und npm installiert sind
  console.log('✓ Node.js und npm sind installiert');
  
  // Erstelle notwendige Verzeichnisse
  try {
    for (const folder of FOLDERS_TO_CREATE) {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        console.log(`✓ Ordner "${folder}" erstellt`);
      } else {
        console.log(`✓ Ordner "${folder}" existiert bereits`);
      }
    }
    
    // Erstelle .gitkeep-Dateien, damit die Ordner in Git verfolgt werden
    fs.writeFileSync(path.join('./data', '.gitkeep'), '');
    fs.writeFileSync(path.join('./logs', '.gitkeep'), '');
  } catch (error) {
    console.error(`✗ Fehler beim Erstellen der Verzeichnisse: ${error}`);
  }
  
  // Prüfe, ob .env-Datei existiert
  if (!fs.existsSync('.env')) {
    console.log('!');
    console.log('! Die .env-Datei wurde nicht gefunden.');
    console.log('! Bitte erstelle eine .env-Datei basierend auf der .env.example-Datei.');
    console.log('! Du kannst dies jetzt tun...');
    console.log('!');
    
    // Frage nach den Discord-Token
    askForEnvironmentVariables();
  } else {
    console.log('✓ .env-Datei existiert bereits');
    console.log('');
    console.log('Setup abgeschlossen!');
    console.log('');
    console.log('Als Nächstes:');
    console.log('1. Führe "node deploy-commands.js" aus, um die Befehle zu registrieren');
    console.log('2. Starte den Bot mit "node index.js"');
    console.log('');
    rl.close();
  }
}

/**
 * Fragt den Benutzer nach den notwendigen Umgebungsvariablen
 */
function askForEnvironmentVariables() {
  console.log('');
  console.log('Bitte gib die erforderlichen Informationen ein:');
  
  rl.question('Discord Bot Token: ', (token) => {
    rl.question('Server ID: ', (serverId) => {
      rl.question('Client ID: ', (clientId) => {
        rl.question('Auto Role ID: ', (autoRoleId) => {
          rl.question('Twitch Client ID (optional - Enter für überspringen): ', (twitchClientId) => {
            rl.question('Twitch Client Secret (optional - Enter für überspringen): ', (twitchClientSecret) => {
              rl.question('YouTube API Key (optional - Enter für überspringen): ', (youtubeApiKey) => {
                
                // Erstelle die .env-Datei
                let envContent = `# Discord Bot Konfiguration\n`;
                envContent += `DISCORD_TOKEN=${token}\n`;
                envContent += `SERVER_ID=${serverId}\n`;
                envContent += `CLIENT_ID=${clientId}\n`;
                envContent += `AUTO_ROLE_ID=${autoRoleId}\n\n`;
                
                // Füge optionale Konfigurationen hinzu, wenn sie angegeben wurden
                if (twitchClientId && twitchClientId.trim() !== '') {
                  envContent += `# Twitch API\n`;
                  envContent += `TWITCH_CLIENT_ID=${twitchClientId}\n`;
                  
                  if (twitchClientSecret && twitchClientSecret.trim() !== '') {
                    envContent += `TWITCH_CLIENT_SECRET=${twitchClientSecret}\n\n`;
                  }
                }
                
                if (youtubeApiKey && youtubeApiKey.trim() !== '') {
                  envContent += `# YouTube API\n`;
                  envContent += `YOUTUBE_API_KEY=${youtubeApiKey}\n`;
                }
                
                try {
                  fs.writeFileSync('.env', envContent);
                  console.log('✓ .env-Datei wurde erfolgreich erstellt');
                  console.log('');
                  console.log('Setup abgeschlossen!');
                  console.log('');
                  console.log('Als Nächstes:');
                  console.log('1. Führe "node deploy-commands.js" aus, um die Befehle zu registrieren');
                  console.log('2. Starte den Bot mit "node index.js"');
                  console.log('');
                  rl.close();
                } catch (error) {
                  console.error(`✗ Fehler beim Erstellen der .env-Datei: ${error}`);
                  rl.close();
                }
              });
            });
          });
        });
      });
    });
  });
}

// Starte das Setup
setup();