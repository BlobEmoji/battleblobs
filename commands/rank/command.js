
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
        const { message, client, connection } = context;

        context.log('silly', 'acquiring user data for search..');
        const userData = await connection.memberData(context.member);
        const _ = (...x) => client.localize(userData.locale, ...x);
        const _r = (...x) => client.localizeRandom(userData.locale, ...x);
        context.log('silly', 'got user data');


        var currentRank = await connection.getRank(context.member);
        console.log('passed rank');
        var top5 = await connection.getTop5Ranks(context.member);
        console.log('passed top 5')
        var color = 0;
        var response = '';

        top5.forEach(function (element) {
            if (element.user_id == context.author.id) {
                response += `**${element.row_number}: <@${element.user_id}> with ${element.ranking} Blob Trophies**\n`;
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
                response += `${element.row_number}: <@${element.user_id}> with ${element.ranking} **Blob Trophies**\n`;
        });

        if (currentRank.row_number > 5) {
            var adjRanks = await connection.getAdjRanks(context.member, currentRank.row_number);
            response += `...\n`;
            response += `${adjRanks[0].row_number}: <@${adjRanks[0].user_id}> with ${adjRanks[0].ranking} **Blob Trophies**\n`;
            response += `**${currentRank.row_number}: <@${currentRank.user_id}> with ${currentRank.ranking} Blob Trophies**`;
            if (adjRanks.length == 2) {
                response += `\n${adjRanks[1].row_number}: <@${adjRanks[1].user_id}> with ${adjRanks[1].ranking} **Blob Trophies**`;
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
        var a = "#ff0000" // red
        var b = "#00ff00" // green

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
