
const CommandBaseClass = require('../CommandBaseClass.js');

class Choose extends CommandBaseClass {
    constructor(...args) {
        super(...args);

        this.meta = {
            name: 'choose',
            category: 'meta.help.categories.battleblobs',
            description: 'meta.help.commands.choose',
        };
    }

    async run(context) {
        const { message, client, connection } = context;

        context.log('silly', 'acquiring user data for search..');
        const userData = await connection.memberData(context.member);
        const _ = (...x) => client.localize(userData.locale, ...x);
        const _r = (...x) => client.localizeRandom(userData.locale, ...x);
        context.log('silly', 'got user data');

        if (await connection.isPartyEmpty(context.member) == 0) {
            if (message.content.split(" ").length == 7) {
                var blobdefs = [];
                for (let element of message.content.split(" ")) {
                    if (element == "-choose") {
                        continue;
                    }
                    var temp = await connection.searchBlob(element);
                    if (!temp) {
                        context.send("One of those blobs does not exist.");
                        return;
                    }
                    else {
                        blobdefs.push(temp);
                    }
                }
                var blobemojis = [];
                blobdefs.forEach(function (element) {
                    var emoji;
                    if (emoji = context.client.emojis.find(emoji => emoji.id == element.emoji_id)) {
                        if (emoji.animated) {
                            // for animated emojis
                            blobemojis.push("<a:" + emoji.name + ":" + emoji.id + ">");
                        }
                        else {
                            // for regular emojis
                            blobemojis.push("<:" + emoji.name + ":" + emoji.id + ">");
                        }
                    }
                    else {
                        // if the emoji is not found
                        blobemojis.push(":" + element.emoji_name + ":");
                    }
                });

                context.send("Your chosen blobs:\n" + blobemojis.join(' ') 
                + `\nYou will not be able to change them later. \`${context.prefix}confirm\` or \`${context.prefix}cancel\``);

                const re = new RegExp(`^(?:${context.client.prefixRegex})(confirm|cancel)(.*)$`);
                const filter = m => (m.author.id === context.author.id && re.test(m.content));
                let response;
                try {
                    response = re.exec((await context.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] })).first().content);
                } catch (e) {
                    // user didnt respond                   
                    return;
                }
                if (response[1] === 'confirm') {                   
                    blobdefs.forEach(async function (element) {
                        await connection.giveBlobParty(context.member, element);
                    });
                    context.send("Your party has been created!")
                }
            }
            else {
                context.send(`You need to choose six blobs to make a party.\nUsage: \`${context.prefix}choose <blobname> <blobname> <blobname> <blobname> <blobname> <blobname>\``)
            }
        }
        else {
            context.send("You cannot change your party.");
        }
    }
}

module.exports = Choose;
