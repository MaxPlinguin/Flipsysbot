const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Zeigt Informationen über einen Server oder eine Rolle an')
    .addSubcommand(subcommand =>
      subcommand
        .setName('server')
        .setDescription('Zeigt Informationen über den Server an'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('role')
        .setDescription('Zeigt Informationen über eine Rolle an')
        .addRoleOption(option => 
          option.setName('rolle')
            .setDescription('Die Rolle, über die Informationen angezeigt werden sollen')
            .setRequired(true))),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'server') {
        await handleServerInfo(interaction);
      } else if (subcommand === 'role') {
        await handleRoleInfo(interaction);
      }

    } catch (error) {
      logger.error(`Fehler beim Ausführen des info-Befehls: ${error}`);

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

async function handleServerInfo(interaction) {
  const guild = interaction.guild;

  // Berechne das Erstellungsdatum des Servers
  const createdAt = calculateDuration(guild.createdTimestamp);

  // Zähle die Kanäle nach Typ
  const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
  const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
  const categoryChannels = guild.channels.cache.filter(c => c.type === 4).size;

  // Erstelle das Embed mit den Server-Informationen
  const embed = createEmbed(
    `> ${guild.name}`,
    `Informationen über diesen Discord-Server.`,
    config.colors.primary,
    [
      {
        name: '📊 Allgemeine Infos',
        value: `
**ID:** ${guild.id}
**Erstellt am:** ${new Date(guild.createdTimestamp).toLocaleDateString('de-DE')} (${createdAt})
**Eigentümer:** <@${guild.ownerId}>
**Boost-Level:** ${guild.premiumTier} (${guild.premiumSubscriptionCount} Boosts)
        `
      },
      {
        name: '👥 Mitglieder',
        value: `
**Gesamt:** ${guild.memberCount}
**Menschen:** ${guild.members.cache.filter(member => !member.user.bot).size}
**Bots:** ${guild.members.cache.filter(member => member.user.bot).size}
        `
      },
      {
        name: '📜 Kanäle',
        value: `
**Gesamt:** ${textChannels + voiceChannels + categoryChannels}
**Text:** ${textChannels}
**Sprache:** ${voiceChannels}
**Kategorien:** ${categoryChannels}
        `
      },
      {
        name: '👑 Rollen',
        value: `**Anzahl:** ${guild.roles.cache.size - 1}`
      }
    ],
    { text: `Angefordert von ${interaction.user.tag}` },
    guild.iconURL({ dynamic: true })
  );

  // Sende die Server-Informationen
  await interaction.reply({ embeds: [embed], ephemeral: true });
  logger.info(`Server-Informationen für ${guild.name} (${guild.id}) angefordert von ${interaction.user.tag}`);
}

async function handleRoleInfo(interaction) {
  const role = interaction.options.getRole('rolle');
  const guild = interaction.guild;

  // Berechne das Erstellungsdatum der Rolle
  const createdAt = calculateDuration(role.createdTimestamp);

  // Erstelle das Embed mit den Rolleninformationen
  const embed = createEmbed(
    `> Rolle: ${role.name}`,
    `Informationen über diese Rolle auf dem Server.`,
    role.color || config.colors.primary,
    [
      {
        name: '📊 Allgemeine Infos',
        value: `
**ID:** ${role.id}
**Erstellt am:** ${new Date(role.createdTimestamp).toLocaleDateString('de-DE')} (${createdAt})
**Farbe:** ${role.hexColor}
**Position:** ${guild.roles.cache.size - role.position} von ${guild.roles.cache.size}
**Erwähnbar:** ${role.mentionable ? 'Ja' : 'Nein'}
**Angezeigt:** ${role.hoist ? 'Ja' : 'Nein'}
**Integration:** ${role.managed ? 'Ja' : 'Nein'}
        `
      },
      {
        name: '👥 Mitglieder',
        value: `**Anzahl:** ${role.members.size}`
      },
      {
        name: '🔑 Berechtigungen',
        value: `${parsePermissions(role.permissions)}`
      }
    ],
    { text: `Angefordert von ${interaction.user.tag}` }
  );

  // Sende die Rolleninformationen
  await interaction.reply({ embeds: [embed], ephemeral: true });
  logger.info(`Rolleninformationen für ${role.name} (${role.id}) angefordert von ${interaction.user.tag}`);
}

function calculateDuration(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  if (years > 0) {
    return `vor ${years} Jahr${years !== 1 ? 'en' : ''}`;
  } else if (months > 0) {
    return `vor ${months} Monat${months !== 1 ? 'en' : ''}`;
  } else {
    return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
  }
}

function parsePermissions(permissions) {
  const permissionsBitField = permissions.toArray();

  if (permissionsBitField.includes('Administrator')) {
    return '**Administrator** (Alle Berechtigungen)';
  }

  const keyPerms = [
    { name: 'Server verwalten', value: 'ManageGuild' },
    { name: 'Rollen verwalten', value: 'ManageRoles' },
    { name: 'Kanäle verwalten', value: 'ManageChannels' },
    { name: 'Nachrichten verwalten', value: 'ManageMessages' },
    { name: 'Mitglieder kicken', value: 'KickMembers' },
    { name: 'Mitglieder bannen', value: 'BanMembers' },
    { name: 'Einladungen erstellen', value: 'CreateInstantInvite' },
    { name: 'Nickname ändern', value: 'ChangeNickname' },
    { name: 'Nicknames von anderen ändern', value: 'ManageNicknames' }
  ];

  const rolePerms = keyPerms
    .filter(perm => permissionsBitField.includes(perm.value))
    .map(perm => `• ${perm.name}`);

  if (rolePerms.length === 0) {
    return 'Keine besonderen Berechtigungen';
  }

  return rolePerms.join('\n');
}