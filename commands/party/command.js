
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
        context.send({
            embed: {
                color: parseInt(await this.healthColor(cur_total_health / total_health)),
                title: `${context.author.username}'s Party`,
                fields:[
                    {
                        name: blob_emojis[0],
                        value: `\`[${'+'.repeat(party[0].health/party[0].vitality*10) + '-'.repeat(10-party[0].health/party[0].vitality*10)}]\` ${party[0].health}/${party[0].vitality} Lv.${party[0].level}`,
                        inline: true
                    }, 
                    {
                        name: blob_emojis[1],
                        value: `\`[${'+'.repeat(party[1].health/party[1].vitality*10) + '-'.repeat(10-party[1].health/party[1].vitality*10)}]\` ${party[1].health}/${party[1].vitality} Lv.${party[1].level}`,
                        inline: true
                    }, 
                    {
                        name: blob_emojis[2],
                        value: `\`[${'+'.repeat(party[2].health/party[2].vitality*10) + '-'.repeat(10-party[2].health/party[2].vitality*10)}]\` ${party[2].health}/${party[2].vitality} Lv.${party[2].level}`,
                        inline: true
                    }, 
                    {
                        name: blob_emojis[3],
                        value: `\`[${'+'.repeat(party[3].health/party[3].vitality*10) + '-'.repeat(10-party[3].health/party[3].vitality*10)}]\` ${party[3].health}/${party[3].vitality} Lv.${party[3].level}`,
                        inline: true
                    }, 
                    {
                        name: blob_emojis[4],
                        value: `\`[${'+'.repeat(party[4].health/party[4].vitality*10) + '-'.repeat(10-party[4].health/party[4].vitality*10)}]\` ${party[4].health}/${party[4].vitality} Lv.${party[4].level}`,
                        inline: true
                    }, 
                    {
                        name: blob_emojis[5],
                        value: `\`[${'+'.repeat(party[5].health/party[5].vitality*10) + '-'.repeat(10-party[5].health/party[5].vitality*10)}]\` ${party[5].health}/${party[5].vitality} Lv.${party[5].level}`,
                        inline: true
                    }, 
                ]
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
