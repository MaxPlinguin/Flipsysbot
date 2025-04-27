const { EmbedBuilder } = require('discord.js');
const config = require('../config');

/**
 * Creates a styled Discord embed with the 𝐅𝐥𝐢𝐩𝐬𝐲 theme
 * @param {string} title - The title of the embed
 * @param {string} description - The description of the embed
 * @param {string} color - The color of the embed (from config)
 * @param {Object[]} [fields] - Optional fields to add to the embed
 * @param {Object} [footer] - Optional footer to add to the embed
 * @param {string} [thumbnail] - Optional thumbnail URL
 * @param {string} [image] - Optional image URL
 * @returns {EmbedBuilder} - The created embed
 */
function createEmbed(title, description, color = config.colors.primary, fields = [], footer = null, thumbnail = null, image = null) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
  
  // Add fields if provided
  if (fields && fields.length > 0) {
    fields.forEach(field => {
      embed.addFields({ name: field.name, value: field.value, inline: field.inline || false });
    });
  }
  
  // Add footer if provided
  if (footer) {
    embed.setFooter({ text: footer.text, iconURL: footer.iconURL });
  } else {
    embed.setFooter({ text: '𝐅𝐥𝐢𝐩𝐬𝐲 Bot' });
  }
  
  // Add thumbnail if provided
  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }
  
  // Add image if provided
  if (image) {
    embed.setImage(image);
  }
  
  return embed;
}

module.exports = {
  createEmbed
};
