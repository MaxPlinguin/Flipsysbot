
const { handleMemberJoin } = require('../systems/antiRaid');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    try {
      logger.info(`Neues Mitglied beigetreten: ${member.user.tag} (${member.id})`);
      
      // Anti-Raid-Erkennung ausführen
      await handleMemberJoin(member);
      
      // Automatische Rollenzuweisung
      try {
        const roleIds = ['1363126786866810970', '1363127017821700246'];
        
        for (const roleId of roleIds) {
          const role = await member.guild.roles.fetch(roleId);
          if (!role) {
            logger.error(`Auto-Rolle mit ID ${roleId} nicht gefunden`);
            continue;
          }
          await member.roles.add(role);
          logger.info(`Rolle "${role.name}" wurde erfolgreich an ${member.user.tag} vergeben`);
        }
      } catch (roleError) {
        logger.error(`Fehler bei der Zuweisung der Auto-Rollen: ${roleError}`);
      }
      
    } catch (error) {
      logger.error(`Fehler bei der Verarbeitung eines neuen Mitglieds: ${error}`);
    }
  },
};
