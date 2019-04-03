const CommandBaseClass = require('../CommandBaseClass.js');

class Heal extends CommandBaseClass {
  constructor(...args) {
    super(...args);

    this.meta = {
      name: 'heal',
      category: 'meta.help.categories.battleblobs',
      description: 'meta.help.commands.heal',
    };
  }

  async run(context) {
    const { connection } = context;

    context.log('silly', 'acquiring user data for search..');
    const userData = await connection.memberData(context.member);
    context.log('silly', 'got user data');

    if (userData.state_engaged) {
      await context.send('You cannot do that right now.');
      return;
    }
    if (await connection.isPartyEmpty(context.member)) {
      await context.send('You don\'t have a party yet. Use `-choose` to make one.');
      return;
    }
    await connection.healAllBlobs(context.member);
    await context.send('Blobs healed.');
  }
}
module.exports = Heal;
