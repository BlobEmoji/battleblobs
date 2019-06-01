const CommandBaseClass = require('../CommandBaseClass.js');

class Inventory extends CommandBaseClass {
    constructor(...args) {
        super(...args);

        this.meta = {
            name: 'inventory',
            category: 'meta.help.categories.battleblobs',
            description: 'meta.help.commands.inventory',
            aliases: ['bag']
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
            await context.send(_('commands.general.error.engaged'));
            return;
        }
        if (await connection.isPartyEmpty(context.member)) {
            await context.send(_('commands.general.error.partyless'), { PREFIX: context.prefix });
            return;
        }
    }
}
module.exports = Inventory;
