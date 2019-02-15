
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


        await connection.setEngaged(context.member, true);

        if (userData.state_engaged) {
            await context.send('You cannot do that right now.');
            return;
        }


        if (await connection.isPartyEmpty(context.member) == 0) {
            if (message.content.split(' ').length == 7) {
                let blobdefs = [];
                let inputted_blobs = [];
                message.content.split(' ').forEach(x => {
                    let result = x.substring(x.indexOf(':') + 1, x.lastIndexOf(':'));
                    if (result == '')
                        inputted_blobs.push(x);
                    else
                        inputted_blobs.push(result);
                });

                for (let element of inputted_blobs) {
                    if (element == '-choose') {
                        continue;
                    }
                    let temp = await connection.searchBlob(element);
                    if (!temp) {
                        await context.send('One of those blobs does not exist.');
                        await connection.setEngaged(context.member, false);
                        return;
                    }
                    else {
                        blobdefs.push(temp);
                    }
                }
                for (let x = 0; x < blobdefs.length; x++)
                    for (let y = 0; y < blobdefs.length; y++)
                        if (x != y && blobdefs[x].emoji_id == blobdefs[y].emoji_id) {
                            await context.send('You cannot have multiple of the same blob.');
                            await connection.setEngaged(context.member, false);
                            return;
                        }
                let blob_emojis = [];
                blobdefs.forEach(function (element) {
                    let emoji;
                    if (emoji = context.client.emojis.find(emoji => emoji.id == element.emoji_id)) {
                        blob_emojis.push(`${emoji}`);
                    }
                    else {
                        // if the emoji is not found
                        blob_emojis.push(`:${element.emoji_name}:`);
                    }
                });

                await context.send('Your chosen blobs:\n' + blob_emojis.join(' ')
                    + `\nYou will not be able to change them later. \`${context.prefix}confirm\` or \`${context.prefix}cancel\``);

                const re = new RegExp(`^(?:${context.client.prefixRegex})(confirm|cancel)(.*)$`);
                const filter = m => (m.author.id === context.author.id && re.test(m.content));
                let response;
                try {
                    response = re.exec((await context.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] })).first().content);
                } catch (e) {
                    await connection.setEngaged(context.member, false);
                    // user didnt respond                   
                    return;
                }
                if (response[1] === 'confirm') {
                    for (let index = 0; index < blobdefs.length; index++) {
                        await connection.giveBlobParty(context.member, blobdefs[index], index);
                    }
                    await context.send('Your party has been created!');
                }

            }
            else {
                await context.send(`You need to choose six blobs to make a party.\nUsage: \`${context.prefix}choose <blobname> <blobname> <blobname> <blobname> <blobname> <blobname>\``);
            }
        }
        else {
            await context.send('You cannot change your party.');
        }
        await connection.setEngaged(context.member, false);
    }
}

module.exports = Choose;
