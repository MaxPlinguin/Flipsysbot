const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');
const logger = require('./utils/logger');

// Create an array to hold command data
const commands = [];

// Read all command directories
const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));

// Iterate through the command folders
for (const folder of commandFolders) {
  const commandFiles = fs.readdirSync(path.join(__dirname, 'commands', folder)).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(__dirname, 'commands', folder, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      logger.info(`Loaded command: ${command.data.name}`);
    } else {
      logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

// Create and configure REST instance
const rest = new REST().setToken(config.token);

// Function to deploy commands
async function deployCommands() {
  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);
    
    // The route depends on whether you're deploying to a single guild or globally
    const route = Routes.applicationCommands(
      process.env.CLIENT_ID || 'YOUR_APPLICATION_ID'
    );
    
    // Deploy the commands
    const data = await rest.put(route, { body: commands });
    
    logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error(`Error deploying commands: ${error}`);
  }
}

// If this file is run directly, deploy the commands
if (require.main === module) {
  deployCommands();
}

module.exports = { deployCommands };
