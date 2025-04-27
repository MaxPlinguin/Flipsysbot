
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const config = require('../../config');
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Erstelle ein Gewinnspiel')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Erstelle ein neues Gewinnspiel')
        .addStringOption(option =>
          option.setName('time')
            .setDescription('Dauer des Gewinnspiels (z.B. 1h, 1d)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('prize')
            .setDescription('Was wird verlost?')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Beschreibung des Gewinnspiels')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('winners')
            .setDescription('Anzahl der Gewinner')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      const duration = ms(interaction.options.getString('time'));
      if (!duration) {
        return interaction.reply({
          embeds: [createEmbed('Fehler', 'Ungültiges Zeitformat. Beispiele: 1h, 1d, 7d', config.colors.error)],
          ephemeral: true
        });
      }

      const prize = interaction.options.getString('prize');
      const description = interaction.options.getString('description');
      const winners = interaction.options.getInteger('winners');

      const embed = createEmbed(
        '🎉 Neues Gewinnspiel',
        `**Preis:** ${prize}\n\n${description}\n\n**Gewinner:** ${winners}\n**Endet:** <t:${Math.floor((Date.now() + duration) / 1000)}:R>\n\nReagiere mit 🎉 um teilzunehmen!`,
        config.colors.primary
      );

      const message = await interaction.reply({ embeds: [embed], fetchReply: true });
      await message.react('🎉');

      setTimeout(async () => {
        const fetchedMessage = await message.fetch();
        const reaction = fetchedMessage.reactions.cache.get('🎉');
        const users = await reaction.users.fetch();
        const validUsers = users.filter(user => !user.bot);

        if (validUsers.size < winners) {
          return interaction.channel.send({
            embeds: [createEmbed('Gewinnspiel beendet', 'Nicht genug Teilnehmer für die Anzahl der Gewinner.', config.colors.error)]
          });
        }

        const winnerArray = validUsers.random(winners);
        const winnerMentions = winnerArray.map(user => `<@${user.id}>`).join(', ');

        interaction.channel.send({
          embeds: [createEmbed('🎉 Gewinnspiel beendet', `**Preis:** ${prize}\n**Gewinner:** ${winnerMentions}\n\nGlückwunsch!`, config.colors.success)]
        });
      }, duration);

    } catch (error) {
      logger.error(`Fehler beim Erstellen des Gewinnspiels: ${error}`);
      interaction.reply({
        embeds: [createEmbed('Fehler', 'Es ist ein Fehler aufgetreten.', config.colors.error)],
        ephemeral: true
      });
    }
  },
};
