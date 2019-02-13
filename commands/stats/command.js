const CommandBaseClass = require('../CommandBaseClass.js');

class Stats extends CommandBaseClass {
    constructor(...args) {
        super(...args);

        this.meta = {
            name: 'stats',
            category: 'meta.help.categories.battleblobs',
            description: 'meta.help.commands.stats',
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

        const party = await connection.getParty(context.member);

        let slot = message.content.split(" ").slice(1, 2).join(" ");

        if (slot < 1 || slot > 6) {
            await context.send('Please select a blob slot between 1 and 6.');
            return;
        }

        // values
        let blob = party[slot - 1];

        let name = blob.emoji_name;
        let level = blob.blob_level;
        let experience = blob.experience;
        let health = blob.health;
        let max_health = blob.vitality;
        let attack = blob.attack;
        let defense = blob.defense;
        let speed = blob.speed;

        let move_one = (await connection.getMove(blob.move_one)).move_name;
        let move_two = (await connection.getMove(blob.move_two)).move_name;
        let move_three = (await connection.getMove(blob.move_three)).move_name;
        let move_four = (await connection.getMove(blob.move_four)).move_name;

        // embed
        await context.send({
            embed: {
                color: parseInt(await this.healthColor(health / max_health)),
                title: `${context.author.username}'s ${name}`,
                footer: {
                    text: "-party to view your Party"
                },
                fields: [
                    {
                        name: "\u200B",
                        value: `Level:         ${level}\nExp:            ${experience}`
                    }, {
                        name: "\u200B",
                        value: `HP:\t\t\t${health}/${max_health}\n` +
                        `Attack:\t\t\t${attack}\n`+
                        `Defense:\t\t\t${defense}\n`+
                        `Speed:\t\t\t${attack}\n`
                    }, {
                        name: "Attack list",
                        value: `${move_one}\n${move_two}\n${move_three}\n${move_four}`
                    }
                ]
            }
        }).catch(console.error);


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
module.exports = Stats;
