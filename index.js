require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');
const logger = require('./utils/logger');
const { setupAntiRaid } = require('./systems/antiRaid');
const { setupAntiSpam } = require('./systems/antiSpam');
const { setupYoutubeNotifier } = require('./systems/youtubeNotifier');
const { setupTwitchNotifier } = require('./systems/twitchNotifier');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions, // Für die Reaktionen bei Whitelist-Anfragen
    // Die folgenden Intents sind privilegiert und müssen im Discord Developer Portal aktiviert werden
    // Wenn du sie nicht aktivieren möchtest, kannst du sie auskommentieren
    // GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Channel, 
    Partials.Message, 
    Partials.User, 
    Partials.GuildMember,
    Partials.Reaction, // Für Reaktionen auf ältere Nachrichten
  ],
});

// Diese Server-Komponente ist optional für lokales Hosting
// Du kannst sie aktivieren, um zu überprüfen, ob der Bot läuft
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot is online!');
});

app.get('/ping', (req, res) => {
  res.status(200).send('OK');
});

const server = app.listen(3000, 'localhost', () => {
  console.log('Status-Server läuft auf http://localhost:3000');
});

// Create collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Load all event files
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Load all command files
const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));

for (const folder of commandFolders) {
  const commandFiles = fs.readdirSync(path.join(__dirname, 'commands', folder)).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(__dirname, 'commands', folder, file);
    const command = require(filePath);
    
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

// Setup protection systems and maintenance
setupAntiRaid(client);
setupAntiSpam(client);
setupYoutubeNotifier(client);
setupTwitchNotifier(client);

// Handle process errors
process.on('unhandledRejection', error => {
  logger.error(`Unhandled promise rejection: ${error}`);
});

process.on('uncaughtException', error => {
  logger.error(`Uncaught exception: ${error}`);
  // Attempt to gracefully exit
  client.destroy();
  process.exit(1);
});

// Verbesserte Fehlerbehandlung
client.on('disconnect', () => {
  logger.warn('Bot wurde getrennt, versuche neu zu verbinden...');
  setTimeout(() => client.login(process.env.DISCORD_TOKEN || config.token), 5000);
});

client.on('error', error => {
  logger.error(`Client Fehler: ${error}`);
  client.destroy();
  setTimeout(() => client.login(process.env.DISCORD_TOKEN || config.token), 5000);
});

// Zusätzliche Stabilität
client.on('shardError', error => {
  logger.error(`Ein Shard-Fehler ist aufgetreten: ${error}`);
});

client.on('warn', info => {
  logger.warn(`Warnung: ${info}`);
});

// Verbindungswiederherstellung
setInterval(() => {
  if (!client.isReady()) {
    logger.warn('Bot ist nicht verbunden, versuche Neuverbindung...');
    client.login(process.env.DISCORD_TOKEN || config.token);
  }
}, 30000);

// Versuche Verbindung wiederherzustellen
function loginWithRetry(maxRetries = 10) {
  let attempts = 0;
  
  function attemptLogin() {
    client.login(process.env.DISCORD_TOKEN || config.token)
      .then(() => {
        logger.info('Bot erfolgreich eingeloggt');
        attempts = 0;
      })
      .catch(error => {
        attempts++;
        logger.error(`Login fehlgeschlagen (Versuch ${attempts}): ${error}`);
        
        if (attempts < maxRetries) {
          logger.info(`Versuche erneut in 5 Sekunden...`);
          setTimeout(attemptLogin, 5000);
        } else {
          logger.error('Maximale Anzahl an Versuchen erreicht');
          process.exit(1);
        }
      });
  }
  
  attemptLogin();
}

// Initial login
loginWithRetry();
