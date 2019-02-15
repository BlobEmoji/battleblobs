const CommandBaseClass = require('../CommandBaseClass.js');

class Use extends CommandBaseClass {
    constructor(...args) {
        super(...args);

        this.meta = {
            name: 'use',
            category: 'meta.help.categories.battleblobs',
            description: 'meta.help.commands.use',
            aliases: ['useitem']
        };
    }

    async run(context) {
        const { message, client, connection } = context;

        context.log('silly', 'acquiring user data for search..');
        const userData = await connection.memberData(context.member);
        const _ = (...x) => client.localize(userData.locale, ...x);
        const _r = (...x) => client.localizeRandom(userData.locale, ...x);
        context.log('silly', 'got user data');

        if (userData.state_engaged) {
            await context.send('You cannot do that right now.');
            return;
        }
        if (await connection.isPartyEmpty(context.member)) {
            await context.send('You don\'t have a party yet. Use \`-choose\` to make one.');
            return;
        }
    }
}
module.exports = Use;
