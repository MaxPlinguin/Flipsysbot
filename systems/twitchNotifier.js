const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');

// Twitch-Kanal, den wir überwachen möchten
const TWITCH_CHANNEL = 'fiiipsy';
// Discord-Kanal, in den die Benachrichtigung gesendet werden soll
const DISCORD_CHANNEL_ID = '1363118783299977228';
// Überprüfungsintervall (5 Minuten)
const CHECK_INTERVAL = 5 * 60 * 1000;
// Variable zum Speichern, ob der Streamer live ist
let isCurrentlyLive = false;

// Speichern der OAuth-Token-Informationen
let twitchAccessToken = '';
let tokenExpiry = 0;

/**
 * Richtet das Twitch-Benachrichtigungssystem ein
 * @param {Client} client - Der Discord-Client
 */
async function setupTwitchNotifier(client) {
  logger.info(`Twitch-Benachrichtigungssystem wird eingerichtet für Kanal: ${TWITCH_CHANNEL}`);
  
  // Überprüfe zunächst, ob die erforderlichen Umgebungsvariablen vorhanden sind
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    logger.warn('Twitch-API-Schlüssel fehlen. Twitch-Benachrichtigungen sind deaktiviert.');
    logger.warn('Setze TWITCH_CLIENT_ID und TWITCH_CLIENT_SECRET Umgebungsvariablen, um diese Funktion zu aktivieren.');
    return;
  }
  
  // Das erste Mal direkt nach dem Starten prüfen
  try {
    // Zuerst ein Access-Token holen
    await refreshAccessToken();
    await checkIfLive(client);
  } catch (error) {
    logger.error(`Fehler bei der ersten Twitch-Überprüfung: ${error}`);
  }
  
  // Intervall für regelmäßige Überprüfungen
  setInterval(async () => {
    try {
      // Prüfen, ob wir ein neues Token benötigen
      if (Date.now() >= tokenExpiry) {
        await refreshAccessToken();
      }
      await checkIfLive(client);
    } catch (error) {
      logger.error(`Fehler bei der Twitch-Überprüfung: ${error}`);
    }
  }, CHECK_INTERVAL);
}

/**
 * Holt ein neues OAuth-Zugriffstoken von der Twitch API
 */
async function refreshAccessToken() {
  try {
    logger.info('Aktualisiere Twitch Access-Token');
    
    const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials'
      }
    });
    
    twitchAccessToken = response.data.access_token;
    // Token läuft in X Sekunden ab, wir erneuern es 60 Sekunden früher
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    
    logger.info('Twitch Access-Token erfolgreich aktualisiert');
  } catch (error) {
    logger.error(`Fehler beim Holen des Twitch Access-Tokens: ${error}`);
    throw error;
  }
}

/**
 * Überprüft, ob der Twitch-Kanal live ist
 * @param {Client} client - Der Discord-Client
 */
async function checkIfLive(client) {
  try {
    logger.info(`Überprüfe, ob ${TWITCH_CHANNEL} live ist...`);
    
    const response = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${TWITCH_CHANNEL}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${twitchAccessToken}`
      }
    });
    
    const streams = response.data.data;
    const isLive = streams.length > 0;
    
    // Wir senden nur eine Benachrichtigung, wenn der Streamer gerade live gegangen ist (Status-Änderung)
    if (isLive && !isCurrentlyLive) {
      logger.info(`${TWITCH_CHANNEL} ist jetzt live! Sende Benachrichtigung.`);
      
      // Hole zusätzliche Informationen über den Benutzer
      const userResponse = await axios.get(`https://api.twitch.tv/helix/users?login=${TWITCH_CHANNEL}`, {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${twitchAccessToken}`
        }
      });
      
      const user = userResponse.data.data[0];
      const stream = streams[0];
      
      await sendLiveNotification(client, user, stream);
      isCurrentlyLive = true;
    } else if (!isLive && isCurrentlyLive) {
      logger.info(`${TWITCH_CHANNEL} ist nicht mehr live.`);
      isCurrentlyLive = false;
    } else {
      logger.info(`${TWITCH_CHANNEL} Status unverändert: ${isLive ? 'live' : 'offline'}`);
    }
  } catch (error) {
    logger.error(`Fehler beim Überprüfen des Live-Status: ${error}`);
    throw error;
  }
}

/**
 * Sendet eine Discord-Benachrichtigung, wenn der Streamer live geht
 * @param {Client} client - Der Discord-Client
 * @param {Object} user - Twitch-Benutzerinformationen
 * @param {Object} stream - Twitch-Stream-Informationen
 */
async function sendLiveNotification(client, user, stream) {
  try {
    const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
    
    if (!channel) {
      logger.error(`Benachrichtigungskanal ${DISCORD_CHANNEL_ID} konnte nicht gefunden werden.`);
      return;
    }
    
    // Erstelle ein schönes Embed für die Benachrichtigung
    const embed = new EmbedBuilder()
      .setTitle(`🔴 𝐅𝐥𝐢𝐩𝐬𝐲 ist jetzt live auf Twitch!`)
      .setURL(`https://twitch.tv/${TWITCH_CHANNEL}`)
      .setColor('#6441A4') // Twitch-Lila
      .setDescription(`**${stream.title}**\n\nSchalte jetzt ein und unterstütze den Stream!`)
      .addFields(
        { name: '🎮 Kategorie', value: stream.game_name || 'Keine Kategorie', inline: true },
        { name: '👀 Zuschauer', value: stream.viewer_count.toString(), inline: true }
      )
      .setImage(stream.thumbnail_url.replace('{width}', '1280').replace('{height}', '720') + `?date=${Date.now()}`)
      .setThumbnail(user.profile_image_url)
      .setFooter({ text: '𝐅𝐥𝐢𝐩𝐬𝐲 Discord Bot' })
      .setTimestamp();
    
    // Sende die Benachrichtigung
    await channel.send({ 
      content: `@everyone **𝐅𝐥𝐢𝐩𝐬𝐲 ist jetzt live auf Twitch!** https://twitch.tv/${TWITCH_CHANNEL}`, 
      embeds: [embed] 
    });
    
    logger.info('Twitch-Live-Benachrichtigung erfolgreich gesendet.');
  } catch (error) {
    logger.error(`Fehler beim Senden der Twitch-Benachrichtigung: ${error}`);
  }
}

module.exports = {
  setupTwitchNotifier
};