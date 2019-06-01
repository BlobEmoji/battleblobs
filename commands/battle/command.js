


const CommandBaseClass = require('../CommandBaseClass.js');
const BattleController = require('./BattleController.js');

class Battle extends CommandBaseClass {
  constructor(...args) {
    super(...args);

    this.meta = {
      name: 'battle',
      category: 'meta.help.categories.battleblobs',
      description: 'meta.help.commands.battle',
    };
  }

  async run(context) {
    const { client, connection } = context;



    context.log('silly', 'acquiring user data for search..');
    const userData = await connection.memberData(context.member);
    const _ = (...x) => client.localize(userData.locale, ...x);

    context.log('silly', 'got user data');
    if (userData.state_engaged) {
      await context.send(_('commands.general.error.engaged'));
      return;
    }
    if (await connection.isPartyEmpty(context.member)) {
      await context.send(_('commands.general.error.partyless', { PREFIX: context.prefix }));
      return;
    }

    const player_datas = [];
    const guild_members = [];

    const party = await connection.getParty(context.member);

    await connection.setEngaged(context.member, true);

    if (party.reduce(function(total, blob) { return total + blob.health; }, 0) <= 0) {
      await connection.setEngaged(context.member, false);
      await context.send(_('commands.battle.error.all_blobs_fainted'));
      return;
    }
    guild_members.push(context.member);
    player_datas.push(userData);

    let target_member = context.message.mentions.members.first();
    if (!target_member && !isNaN(context.args))
      target_member = context.guild.member(context.args);

    if (target_member) {
      const targetData = await connection.memberData(target_member);

      const enemy_party = await connection.getParty(target_member);
      if (target_member.user.id === context.member.user.id) {
        await connection.setEngaged(context.member, false);
        await context.send(_('commands.battle.error.battling_yourself'));
        return;
      }
      if (targetData.state_engaged) {
        await connection.setEngaged(context.member, false);
        await context.send(_('commands.battle.error.target_engaged'));
        return;
      }

      if (enemy_party.length !== 6) {
        await connection.setEngaged(context.member, false);
        await context.send(_('commands.battle.error.target_partyless'));
        return;
      }
      if (enemy_party.reduce(function(total, blob) { return total + blob.health; }, 0) <= 0) {
        await connection.setEngaged(context.member, false);
        await context.send(_('commands.battle.error.target_blobs_fainted'));
        return;
      }
      guild_members.push(target_member);
      player_datas.push(targetData);
      const _t = (...x) => client.localize(targetData.locale, ...x);
      await connection.setEngaged(target_member, true);
      await context.send(_t('commands.battle.battle_invite', { TARGET: target_member, USER: context.member.user.username, PREFIX: context.prefix }));
      const re = new RegExp(`^(?:${context.client.prefixRegex})(accept|decline)(.*)$`);
      const filter = m => (m.author.id === target_member.id && re.test(m.content));
      let response;
      try {
        response = re.exec((await context.channel.awaitMessages(filter, { max: 1, time: 30000, errors: ['time'] })).first().content);
      } catch (e) {
        // user didnt respond
        await connection.setEngaged(context.member, false);
        await connection.setEngaged(target_member, false);
        return;
      }
      if (response[1] === 'decline') {
        await connection.setEngaged(context.member, false);
        await connection.setEngaged(target_member, false);
        return;
      }

    }


    const battle_message = await context.send(_('commands.battle.battle_starting'));
    const controller = new BattleController(context, connection, guild_members, player_datas, battle_message);
    await controller.setup();

  }
}



module.exports = Battle;
