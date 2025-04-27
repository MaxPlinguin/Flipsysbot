module.exports = {
  // Discord Bot Token
  token: process.env.DISCORD_TOKEN || 'YOUR_DISCORD_BOT_TOKEN',
  
  // Server ID
  serverId: process.env.SERVER_ID || 'YOUR_SERVER_ID',
  
  // Minecraft RCON Configuration
  minecraft: {
    host: process.env.MINECRAFT_HOST || 'localhost',
    port: parseInt(process.env.MINECRAFT_RCON_PORT) || 25575,
    password: process.env.MINECRAFT_RCON_PASSWORD || 'minecraft',
    timeout: 5000 // Timeout in milliseconds
  },
  
  // YouTube API Key
  youtubeApiKey: process.env.YOUTUBE_API_KEY || 'YOUR_YOUTUBE_API_KEY',
  
  // YouTube Channel ID to monitor
  youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID || 'YOUR_YOUTUBE_CHANNEL_ID',
  
  // Notification and log channels
  logChannelId: process.env.LOG_CHANNEL_ID || 'YOUR_LOG_CHANNEL_ID',
  youtubeNotificationChannelId: process.env.YOUTUBE_NOTIFICATION_CHANNEL_ID || 'YOUR_YOUTUBE_NOTIFICATION_CHANNEL_ID',
  whitelistChannelId: process.env.WHITELIST_CHANNEL_ID || '1362092104070729932',  // Channel für Whitelist-Anfragen
  adminChannelId: process.env.ADMIN_CHANNEL_ID || '1362794744689856663',        // Channel für Admin-Benachrichtigungen
  
  // Role IDs
  adminRoleId: process.env.ADMIN_ROLE_ID || 'YOUR_ADMIN_ROLE_ID',
  moderatorRoleId: process.env.MODERATOR_ROLE_ID || 'YOUR_MODERATOR_ROLE_ID',
  autoRoleId: process.env.AUTO_ROLE_ID || 'YOUR_AUTO_ROLE_ID',
  
  // Role Names
  moderatorRoleName: 'Moderator',  // Name der Moderator-Rolle für Whitelist-Genehmigungen
  
  // Ticket categories
  ticketCategories: ['Support', 'Bug Report', 'Appeal', 'Other'],
  
  // Color scheme
  colors: {
    primary: '#FFFFFF', // White
    secondary: '#ADD8E6', // Light Blue
    accent: '#00008B', // Dark Blue
    error: '#FF0000', // Red for error messages
    success: '#00FF00', // Green for success messages
  },
  
  // Anti-raid configuration
  antiRaid: {
    enabled: true,
    joinThreshold: 5, // Number of joins
    joinTimeWindow: 10, // In seconds
    action: 'lockdown', // 'lockdown' or 'notify'
  },
  
  // Anti-spam configuration
  antiSpam: {
    enabled: true,
    messageThreshold: 5, // Number of messages
    messageTimeWindow: 3, // In seconds
    duplicateThreshold: 3, // Number of duplicate messages
    action: 'mute', // 'mute', 'kick', or 'ban'
    muteDuration: 10 * 60 * 1000, // 10 minutes in milliseconds
  },
  
  // YouTube notification check interval (in milliseconds)
  youtubeCheckInterval: 5 * 60 * 1000, // 5 minutes
  
  // Meldungen für Whitelist-System
  messages: {
    invalid_username: 'Der Minecraft-Benutzername `{minecraft_name}` ist ungültig. Namen müssen 3-16 Zeichen lang sein und dürfen nur Buchstaben, Zahlen und Unterstriche enthalten.',
    whitelist_request: '{user} möchte `{minecraft_name}` zur Whitelist hinzufügen. Bitte reagiere mit ✅ zum Annehmen oder ❌ zum Ablehnen.',
    whitelist_approved: '✅ Whitelist-Anfrage für `{minecraft_name}` wurde genehmigt.',
    whitelist_rejected: '❌ Whitelist-Anfrage für `{minecraft_name}` wurde abgelehnt.',
    whitelist_error: '❌ Fehler beim Bearbeiten der Whitelist für `{minecraft_name}`: {error}',
    already_whitelisted: '⚠️ `{minecraft_name}` ist bereits auf der Whitelist.',
    not_whitelisted: '⚠️ `{minecraft_name}` ist nicht auf der Whitelist.',
    rcon_error: '❌ Verbindung zum Minecraft-Server konnte nicht hergestellt werden. Bitte versuche es später erneut.'
  }
};
