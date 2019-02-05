
const CommandBaseClass = require('../CommandBaseClass.js');

class Party extends CommandBaseClass {
    constructor(...args) {
        super(...args);

        this.meta = {
            name: 'party',
            category: 'meta.help.categories.battleblobs',
            description: 'meta.help.commands.party',
        };
    }

    async run(context) {
        const { message, client, connection } = context;

        context.log('silly', 'acquiring user data for search..');
        const userData = await connection.memberData(context.member);
        const _ = (...x) => client.localize(userData.locale, ...x);
        const _r = (...x) => client.localizeRandom(userData.locale, ...x);
        context.log('silly', 'got user data');

        if(userData.state_engaged) {
            await context.send('You cannot do that right now.');
            return;
        }
        
        var party = await connection.getParty(context.member);

        var blob_emojis = [];
        var cur_total_health = 0;
        var total_health = 0;
        
        party.forEach(function (element) {
            var emoji;
            if (emoji = context.client.emojis.find(emoji => emoji.id == element.emoji_id)) {
                blob_emojis.push(`${emoji}`);
            }
            else {
                // if the emoji is not found
                blob_emojis.push(`:${element.emoji_name}:`);
            }

            cur_total_health += element.health;
            total_health += element.vitality;
        });
        var fields_array = [];
        var index = 0;

        party.forEach(x => {
            fields_array.push({
                name: blob_emojis[index],
                value: `\`${'█'.repeat(party[index].health / party[index].vitality * 10) + '-'.repeat(10 - party[index].health / party[index].vitality * 10)}\` ${party[index].health}/${party[index].vitality} Lv. ${party[index].blob_level}`,
                inline: true
            });
            index++;
        });

        await context.send({
            embed: {
                color: parseInt(await this.healthColor(cur_total_health / total_health)),
                title: `${context.author.username}'s Party`,
                footer: {
                    text: "-stats [slot] to view individual statistics"
                },
                fields: fields_array
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



module.exports = Party;
