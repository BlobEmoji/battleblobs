


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

        let player_datas = [];
        let guild_members = [];

        let party = await connection.getParty(context.member);

        await connection.setEngaged(context.member, true);

        if (party.length != 6) {
            await connection.setEngaged(context.member, false);
            await context.send('You must create a party before you can start a battle.\n Try using `-choose`');
            return;
        }

        if (party.reduce(function (total, blob) { return total + blob.health; }, 0) <= 0) {
            await connection.setEngaged(context.member, false);
            await context.send('You do not have any blobs in battling condition.');
            return;
        }
        guild_members.push(context.member);
        player_datas.push(userData);

        let target_member = context.message.mentions.members.first();
        if (!target_member && !isNaN(context.args))
            target_member = context.guild.member(context.args);

        if (target_member) {
            let targetData = await connection.memberData(target_member);

            let enemy_party = await connection.getParty(target_member);
            if (target_member.user.id === context.member.user.id) {
                await connection.setEngaged(context.member, false);
                await context.send('You cannot battle yourself.');
                return;
            }
            if (targetData.state_engaged) {
                await connection.setEngaged(context.member, false);
                await context.send('That player is busy.');
                return;
            }
            if (enemy_party.length != 6) {
                await connection.setEngaged(context.member, false);
                await context.send('That user has not created a party yet.');
                return;
            }
            if (enemy_party.reduce(function (total, blob) { return total + blob.health; }, 0) <= 0) {
                await connection.setEngaged(context.member, false);
                await context.send('That user does not have any blobs in battling condition.');
                return;
            }
            guild_members.push(target_member);
            player_datas.push(targetData);
            await connection.setEngaged(target_member, true);
            await context.send(`${target_member}, ${context.member.user.username} has challenged you to a battle!\n\`${context.prefix}accept\` or \`${context.prefix}decline\``);
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


        let battle_message = await context.send('Battle starting...');
        const controller = new BattleController(context, connection, guild_members, player_datas, battle_message);
        await controller.setup();































        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }
}



module.exports = Battle;
