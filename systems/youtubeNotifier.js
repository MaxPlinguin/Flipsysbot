const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createEmbed } = require('../utils/embedBuilder');
const logger = require('../utils/logger');
const config = require('../config');

// Path for storing the last video ID
const lastVideoFile = path.join(__dirname, '..', 'data', 'lastVideo.json');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Variables to keep track of
let lastVideoId = null;
let checkInterval = null;

/**
 * Sets up the YouTube notification system
 * @param {Client} client - The Discord client
 */
function setupYoutubeNotifier(client) {
  try {
    // Load last video ID if it exists
    if (fs.existsSync(lastVideoFile)) {
      const data = JSON.parse(fs.readFileSync(lastVideoFile, 'utf8'));
      lastVideoId = data.videoId;
      logger.info(`Loaded last YouTube video ID: ${lastVideoId}`);
    } else {
      logger.info('No previous YouTube video ID found');
    }
    
    // Start checking for new videos when the bot is ready
    client.on('ready', () => {
      // Clear any existing interval first
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      
      // Check for new videos on startup
      checkForNewVideos(client);
      
      // Set up interval for checking new videos
      checkInterval = setInterval(() => {
        checkForNewVideos(client);
      }, config.youtubeCheckInterval);
      
      logger.info(`YouTube notifier started, checking every ${config.youtubeCheckInterval / 60000} minutes`);
    });
  } catch (error) {
    logger.error(`Error setting up YouTube notifier: ${error}`);
  }
}

/**
 * Checks for new videos on the configured channel
 * @param {Client} client - The Discord client
 */
async function checkForNewVideos(client) {
  if (!config.youtubeApiKey || !config.youtubeChannelId) {
    logger.warn('YouTube API key or channel ID not configured');
    return;
  }
  
  try {
    // Get the guild - try both servers if one fails
    let guild = client.guilds.cache.get(config.serverId);
    if (!guild) {
      // If we can't find the configured server, try to use any available server
      guild = client.guilds.cache.first();
      if (!guild) {
        logger.error(`Could not find any guild to send notifications to`);
        return;
      } else {
        logger.info(`Using fallback guild: ${guild.name} (${guild.id})`);
      }
    }
    
    // Skip YouTube API call if key is not provided or is the default placeholder
    if (config.youtubeApiKey === 'YOUR_YOUTUBE_API_KEY') {
      logger.warn('Skipping YouTube API check - API key not configured');
      return;
    }
    
    // Make a request to the YouTube API
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: config.youtubeApiKey,
        channelId: config.youtubeChannelId,
        part: 'snippet',
        order: 'date',
        maxResults: 1,
        type: 'video'
      }
    });
    
    // Check if we got any results
    if (response.data.items && response.data.items.length > 0) {
      const latestVideo = response.data.items[0];
      const videoId = latestVideo.id.videoId;
      
      // Check if this is a new video
      if (videoId !== lastVideoId) {
        // Save the new video ID
        lastVideoId = videoId;
        fs.writeFileSync(lastVideoFile, JSON.stringify({ videoId }));
        
        // Get video details
        const videoTitle = latestVideo.snippet.title;
        const videoThumbnail = latestVideo.snippet.thumbnails.high.url;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const channelTitle = latestVideo.snippet.channelTitle;
        const publishedAt = new Date(latestVideo.snippet.publishedAt);
        
        // Only notify if the video was published in the last hour
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
        
        if (publishedAt > oneHourAgo) {
          logger.info(`New YouTube video detected: ${videoTitle}`);
          
          // Send the notification
          const notificationChannel = guild.channels.cache.get(config.youtubeNotificationChannelId);
          if (notificationChannel) {
            await notificationChannel.send({
              content: `@everyone 🔴 **New video from ${channelTitle}!**`,
              embeds: [createEmbed(
                `> ${videoTitle}`,
                `A new video has been uploaded to YouTube!\n\n**Channel:** ${channelTitle}\n**Published:** ${publishedAt.toLocaleString()}\n\n[Watch Now](${videoUrl})`,
                config.colors.primary,
                [],
                { text: `𝐅𝐥𝐢𝐩𝐬𝐲 • ${publishedAt.toLocaleString()}` },
                videoThumbnail
              )]
            });
            
            logger.info(`Sent YouTube notification for video: ${videoId}`);
          } else {
            logger.error(`Could not find YouTube notification channel with ID ${config.youtubeNotificationChannelId}`);
          }
        } else {
          logger.info(`Found older video (${publishedAt.toLocaleString()}), not notifying: ${videoTitle}`);
        }
      } else {
        logger.debug('No new YouTube videos found');
      }
    } else {
      logger.warn('No videos found for the channel');
    }
  } catch (error) {
    logger.error(`Error checking for new YouTube videos: ${error}`);
  }
}

module.exports = {
  setupYoutubeNotifier
};
