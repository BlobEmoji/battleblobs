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

        // message
        const number_emojis = ['1⃣', '2⃣', '3⃣'];        

        let stats_message = await context.send('Please select a reaction:\n1⃣ to check the blob stats, 2⃣ to check your blob\'s attacks in detail, 3⃣ to stop.');

        await stats_message.react(number_emojis[0]);
        await stats_message.react(number_emojis[1]);
        await stats_message.react(number_emojis[2]);


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

        let move_one = (await connection.getMove(blob.move_one));
        let move_one_pp = blob.move_one_pp;

        let move_two = (await connection.getMove(blob.move_two));
        let move_two_pp = blob.move_two_pp;

        let move_three = (await connection.getMove(blob.move_three));
        let move_three_pp = blob.move_three_pp;

        let move_four = (await connection.getMove(blob.move_four));
        let move_four_pp = blob.move_four_pp;

        await waitUserInput();


        // Waits for a user input via reaction
        async function waitUserInput() {
            const filter = (reaction, user) => user.id === context.member.user.id;
            await stats_message.awaitReactions(filter, { max: 1, time: 120000 })
                .then(async collected => {
                    let reaction = collected.first();
                    if (!reaction) { // timed out
                        return;
                    }
                    await reaction.users.remove(context.member.user);
                    switch (reaction.emoji.name) {
                        case number_emojis[0]: // Blob stats
                            await blobStats();
                            break;
                        case number_emojis[1]: // Attack stats
                            await blobAttacks(); 
                            break;
                        case number_emojis[2]: // Stop
                            break;
                    }
                })
                .catch(console.error);
        }

        // Edits message to the blob stats
        async function blobStats() {
            await stats_message.edit({
                embed: {
                    color: parseInt(await this.healthColor(health / max_health)),
                    title: `${context.author.username}'s ${name}`,
                    footer: {
                        text: "React - 1: Blob stats - 2: Attack stats - 3: Stop"
                    },
                    fields: [
                        {
                            name: "\u200B",
                            value: `Level:         ${level}\nExp:            ${experience}`
                        }, {
                            name: "\u200B",
                            value: `HP:\t\t\t${health}/${max_health}\n` +
                                `Attack:\t\t\t${attack}\n` +
                                `Defense:\t\t\t${defense}\n` +
                                `Speed:\t\t\t${speed}\n`
                        }, {
                            name: "Attack list",
                            value: `${move_one.move_name}\n${move_two.move_name}\n${move_three.move_name}\n${move_four.move_name}`
                        }
                    ]
                }
            }).catch(console.error);

            await waitUserInput();
        }

        // Edits message to the attack stats
        async function blobAttacks() {
            await stats_message.edit({
                embed: {
                    color: parseInt(await this.healthColor(health / max_health)),
                    title: `${context.author.username}'s ${name}`,
                    footer: {
                        text: "React - 1: Blob stats - 2: Attack stats - 3: Stop"
                    },
                    fields: [
                        {
                            name: `${move_one.move_name}`,
                            value: `Power:\t\t\t${move_one.damage}\n` +
                            `Accuracy:\t\t${(move_one.accuracy)*100}%\n` + 
                            `PP:\t\t\t\t\t${move_one_pp}/${move_one.max_pp}\n` + 
                            `Description:\t${move_one.description}`
                        }, {
                            name: `${move_two.move_name}`,
                            value: `Power:\t\t\t${move_two.damage}\n` +
                                `Accuracy:\t\t${(move_two.accuracy) * 100}%\n` +
                                `PP:\t\t\t\t\t${move_two_pp}/${move_two.max_pp}\n` +
                                `Description:\t${move_two.description}`
                        }, {
                            name: `${move_three.move_name}`,
                            value: `Power:\t\t\t${move_three.damage}\n` +
                                `Accuracy:\t\t${(move_three.accuracy) * 100}%\n` +
                                `PP:\t\t\t\t\t${move_three_pp}/${move_three.max_pp}\n` +
                                `Description:\t${move_three.description}`
                        }, {
                            name: `${move_four.move_name}`,
                            value: `Power:\t\t\t${move_four.damage}\n` +
                                `Accuracy:\t\t${(move_four.accuracy) * 100}%\n` +
                                `PP:\t\t\t\t\t${move_four_pp}/${move_four.max_pp}\n` +
                                `Description:\t${move_four.description}`
                        }
                    ]
                }
            }).catch(console.error);

            await waitUserInput();
        }

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
