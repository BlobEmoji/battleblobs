
const CommandBaseClass = require('../CommandBaseClass.js');

class Rank extends CommandBaseClass {
  constructor(...args) {
    super(...args);

    this.meta = {
      name: 'rank',
      category: 'meta.help.categories.battleblobs',
      description: 'meta.help.commands.rank',
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
      await context.send(_('commands.general.error.partyless'), { PREFIX: context.prefix });
      return;
    }

    var currentRank = await connection.getRank(context.member);
    console.log('passed rank');
    var top5 = await connection.getTop5Ranks(context.member);
    console.log('passed top 5');
    var color = 0;
    var response = '';


    top5.forEach(function(element) {
      if (element.user_id === context.author.id) {
        response += _('commands.rank.response', { PLACE: element.row_number, USERID: element.user_id, TROPHIES: element.ranking });
        switch (element.row_number) {
          case '1':
            color = 16766720;
            break;
          case '2':
            color = 12632256;
            break;
          case '3':
            color = 13467442;
            break;
        }
      }
      else
        response += _('commands.rank.response', { PLACE: element.row_number, USERID: element.user_id, TROPHIES: element.ranking });
    });

    if (currentRank.row_number > 5) {
      var adjRanks = await connection.getAdjRanks(context.member, currentRank.row_number);
      response += '...\n';
      response += _('commands.rank.response', { PLACE: adjRanks[0].row_number, USERID: adjRanks[0].user_id, TROPHIES: adjRanks[0].ranking });
      response += _('commands.rank.last_rank_response', { PLACE: currentRank.row_number, USERID: currentRank.user_id, TROPHIES: currentRank.ranking });
      if (adjRanks.length === 2) {
        response += `\n`;
        response += _('commands.rank.last_rank_response', { PLACE: adjRanks[1].row_number, USERID: adjRanks[1].user_id, TROPHIES: adjRanks[1].ranking });
      }
    }
    context.send({
      embed: {
        color: color,
        description: response,
      }
    });



  }
  async healthColor(amount) {
    var a = '#ff0000'; // red
    var b = '#00ff00'; // green

    var ah = parseInt(a.replace(/#/g, ''), 16),
      ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
      bh = parseInt(b.replace(/#/g, ''), 16),
      br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
      rr = ar + amount * (br - ar),
      rg = ag + amount * (bg - ag),
      rb = ab + amount * (bb - ab);
    return '0x' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
  }
}



module.exports = Rank;
