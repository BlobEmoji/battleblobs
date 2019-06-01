
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
    const { client, message, connection } = context;

    context.log('silly', 'acquiring user data for search..');
    const userData = await connection.memberData(context.member);
    const _ = (...x) => client.localize(userData.locale, ...x);
    context.log('silly', 'got user data');


    await connection.setEngaged(context.member, true);

    if (userData.state_engaged) {
      await context.send(_('commands.general.error.engaged'));
      return;
    }


    if (await connection.isPartyEmpty(context.member)) {
      if (message.content.split(' ').length === 7) {
        const blobdefs = [];
        const inputted_blobs = [];
        message.content.split(' ').forEach(x => {
          const result = x.substring(x.indexOf(':') + 1, x.lastIndexOf(':'));
          if (result === '')
            inputted_blobs.push(x);
          else
            inputted_blobs.push(result);
        });

        for (const element of inputted_blobs) {
          if (element === `${context.prefix}choose`) {
            continue;
          }
          const temp = await connection.searchBlob(element);
          if (!temp) {
            await context.send(_('commands.choose.error.non_existent_blob'));
            await connection.setEngaged(context.member, false);
            return;
          }
          else {
            blobdefs.push(temp);
          }
        }
        for (let x = 0; x < blobdefs.length; x++)
          for (let y = 0; y < blobdefs.length; y++)
            if (x !== y && blobdefs[x].emoji_id === blobdefs[y].emoji_id) {
              await context.send(_('commands.choose.error.duplicated_blob'));
              await connection.setEngaged(context.member, false);
              return;
            }
        const blob_emojis = [];
        blobdefs.forEach(function(element) {
          const emoji = context.client.emojis.find(emoji => emoji.id === element.emoji_id);
          if (emoji) {
            blob_emojis.push(`${emoji}`);
          }
          else {
            // if the emoji is not found
            blob_emojis.push(`:${element.emoji_name}:`);
          }
        });

        await context.send(_('commands.choose.choose_prompt', { BLOBS: blob_emojis.join(' '), PREFIX: context.prefix }));

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
          await context.send(_('commands.choose.party_created'));
        }

      }
      else {
        await context.send(_('commands.choose.error.six_blobs_required', { PREFIX: context.prefix }));
      }
    }
    else {
      await context.send(_('commands.choose.error.cant_change_party'));
    }
    await connection.setEngaged(context.member, false);
  }
}

module.exports = Choose;
