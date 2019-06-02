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
    const { client, connection } = context;

    context.log('silly', 'acquiring user data for search..');
    const userData = await connection.memberData(context.member);
    const _ = (...x) => client.localize(userData.locale, ...x);
    context.log('silly', 'got user data');

    if (userData.state_engaged) {
      await context.send(_('commands.general.error.engaged'));
      return;
    }
    if (await connection.isPartyEmpty(context.member)) {
      await context.send(_('commands.general.error.partyless'), { PREFIX: context.prefix });
      return;
    }
    await connection.setEngaged(context.member, true);
    const party = await connection.getParty(context.member);



    // values
    let blob;
    let emoji;


    let total_experience;
    let total_ivs;
    let color;
    let move_one;
    let move_two;
    let move_three;
    let move_four;
    let page = -1;
    let current_slot = 1;

    await changeBlob(parseInt(context.args));

    const emojis = ['⬅', '➡', '1⃣', '2⃣', '3⃣'];




    const stats_message = await context.send(_('commands.stats.loading'));

    for (let i = 0; i < emojis.length; i++) {
      await stats_message.react(emojis[i]);
    }
    await changeBlob();
    await blobStats();

    await connection.setEngaged(context.member, false);

    // Waits for a user input via reaction
    async function waitUserInput() {
      const filter = (reaction, user) => user.id === context.member.user.id;
      await stats_message.awaitReactions(filter, { max: 1, time: 120000 })
        .then(async collected => {
          const reaction = collected.first();
          if (!reaction) { // timed out
            return;
          }
          await reaction.users.remove(context.member.user);
          switch (reaction.emoji.name) {
            case emojis[0]:
              await changeBlob(current_slot - 1);
              break;
            case emojis[1]:
              await changeBlob(current_slot + 1);
              break;
            case emojis[2]: // Blob stats
              await blobStats();
              break;
            case emojis[3]: // Attack stats
              await blobAttacks();
              break;
            case emojis[4]: // Stop
              break;
          }
        })
        .catch(console.error);
    }

    // Edits message to the blob stats
    async function blobStats() {
      page = 0;
      await stats_message.edit({
        embed: {
          color: color,
          title: _('commands.stats.title', { USER: context.author.username, BLOB: blob.emoji_name}),
          thumbnail: {
            url: emoji.url
          },
          footer: {
            text: _('commands.stats.footer')
          },
          fields: [
            {
              name: 'Stats',
              value: _('commands.stats.blob_stats'),
              inline: true
            }, {
              name: '\u200B',
              value:
                                `${blob.slot + 1}\n` +
                                `${blob.blob_level}\n` +
                                `${blob.experience}/${total_experience}\n` +
                                `${blob.health}/${blob.vitality}\n` +
                                `${blob.attack}\n` +
                                `${blob.defense}\n` +
                                `${blob.speed}`,
              inline: true
            }
          ]
        }
      }).catch(console.error);

      await waitUserInput();
    }

    // Edits message to the attack stats
    async function blobAttacks() {
      page = 1;
      await stats_message.edit({
        embed: {
          color: color,
          title: _('commands.stats.title', { USER: context.author.username, BLOB: blob.emoji_name}),
          thumbnail: {
            url: emoji.url
          },
          footer: {
            text: _('commands.stats.footer')
          },
          fields: [
            {
              name: `${move_one.move_name}`,
              value: _('commands.stats.attack_stats', {
                DAMAGE: move_one.damage,
                ACCURACY: (move_one.accuracy) * 100,
                PP: blob.move_one_pp,
                MAXPP: move_one.max_pp,
                DESCRIPTION: move_one.description}
              ),
            }, {
              name: `${move_two.move_name}`,
              value: _('commands.stats.attack_stats', {
                DAMAGE: move_two.damage,
                ACCURACY: (move_two.accuracy) * 100,
                PP: blob.move_two_pp,
                MAXPP: move_two.max_pp,
                DESCRIPTION: move_two.description}
              ),
            }, {
              name: `${move_three.move_name}`,
              value: _('commands.stats.attack_stats', {
                DAMAGE: move_three.damage,
                ACCURACY: (move_three.accuracy) * 100,
                PP: blob.move_three_pp,
                MAXPP: move_three.max_pp,
                DESCRIPTION: move_three.description}
              ),
            }, {
              name: `${move_four.move_name}`,
              value: _('commands.stats.attack_stats', {
                DAMAGE: move_four.damage,
                ACCURACY: (move_four.accuracy) * 100,
                PP: blob.move_four_pp,
                MAXPP: move_four.max_pp,
                DESCRIPTION: move_four.description}
              ),
            }
          ]
        }
      }).catch(console.error);

      await waitUserInput();
    }

    async function changeBlob(slot) {
      if (slot < 1 || slot > 6 || isNaN(slot)) {
        slot = current_slot;
      }

      blob = party[slot - 1];

      emoji = context.client.emojis.find(emoji => emoji.id === blob.emoji_id);


      total_experience = Math.pow(blob.blob_level + 1, 3);
      total_ivs = blob.health_iv + blob.attack_iv + blob.defense_iv + blob.speed_iv;
      color = parseInt(await ivColor(total_ivs / (31 * 4)));
      move_one = (await connection.getMove(blob.move_one));
      move_two = (await connection.getMove(blob.move_two));
      move_three = (await connection.getMove(blob.move_three));
      move_four = (await connection.getMove(blob.move_four));
      current_slot = slot;
      switch (page) {
        case 0:
          await blobStats();
          break;
        case 1:
          await blobAttacks();
          break;
      }
    }
    async function ivColor(amount) {
      const a = '#000000'; // black
      const b = '#FCC21B'; // blob color

      const ah = parseInt(a.replace(/#/g, ''), 16),
        ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
        bh = parseInt(b.replace(/#/g, ''), 16),
        br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
        rr = ar + amount * (br - ar),
        rg = ag + amount * (bg - ag),
        rb = ab + amount * (bb - ab);
      return '0x' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
    }
  }

}
module.exports = Stats;
