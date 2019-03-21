const CommandBaseClass = require('../CommandBaseClass.js');
const StoreItem = require('./StoreItem.js');
const PotionItem = require('./ItemTypes/PotionItem.js');
const PercentagePotionItem = require('./ItemTypes/PercentagePotionItem.js');
const ReviveItem = require('./ItemTypes/ReviveItem.js');
const StatusHealItem = require('./ItemTypes/StatusHealItem.js');
const StatUpItem = require('./ItemTypes/StatUpItem.js');
const TmItem = require('./ItemTypes/TmItem.js');
class Store extends CommandBaseClass {
    constructor(...args) {
        super(...args);

        this.meta = {
            name: 'store',
            category: 'meta.help.categories.battleblobs',
            description: 'meta.help.commands.store',
            aliases: ['shop']
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
        if (await connection.isPartyEmpty(context.member)) {
            await context.send('You don\'t have a party yet. Use \`-choose\` to make one.');
            return;
        }
        await connection.setEngaged(context.member, true);
        const emojis = ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '⬅', '➡', '❌'];
        const store_items = await connection.getStoreItems();

        const store_message = await context.send('Loading...');

        await store_message.react(emojis[5]);
        for (let i = 0; i < 5; i++) {
            await store_message.react(emojis[i]);
        }
        await store_message.react(emojis[6]);
        await store_message.react(emojis[7]);

        let page = 1;
        let max_pages = Math.ceil(store_items.length / 5);
        await updateStoreList();

        await storeNavigation();

        await connection.setEngaged(context.member, false);
        await store_message.edit('Store closed.', { embed: null });

        async function storeNavigation() {
            const filter = (reaction, user) => user.id === context.member.user.id;
            await store_message.awaitReactions(filter, { max: 1, time: 120000 })
                .then(async collected => {
                    const reaction = collected.first();
                    if (!reaction) { // timed out
                        return;
                    }
                    await reaction.users.remove(context.member.user);
                    switch (reaction.emoji.name) {
                        case emojis[5]:
                            page = Math.max(1, page - 1);
                            await updateStoreList();
                            await storeNavigation();
                            break;
                        case emojis[6]:
                            page = Math.min(max_pages, page + 1);
                            await updateStoreList();
                            await storeNavigation();
                            break;
                        case emojis[7]:
                            return;
                        default:
                            let index = emojis.findIndex(x => x === reaction.emoji.name);
                            await showItem(index + 5 * (page - 1));
                    }
                })
                .catch(console.error);
        }

        async function showItem(item_id) {
            let item = store_items[item_id];
            let store_item;
            switch (item.mode) {
                case 1:
                    store_item = new PotionItem(context, item);
                    break;
                case 2:
                    store_item = new PercentagePotionItem(context, item);
                    break;
                case 3:
                    store_item = new ReviveItem(context, item);
                    break;
                case 4:
                    store_item = new StatusHealItem(context, item);
                    break;
                case 5:
                    store_item = new StatUpItem(context, item);
                    break;
                case 6:
                    store_item = new TmItem(context, item);
                    break;
            }
            let fields = await store_item.getFields();
            let options_text = [];
            let options = await store_item.getOptions();
            for (let i = 0; i < options.length; i++) {
                options_text.push(emojis[i] + options[i]);
            }
            fields.push({
                name: 'Options',
                value: options_text.join(' ')
            });

            await store_message.edit({
                embed: {
                    title: 'Item Information',
                    description: `Item #${item_id + 1} (Owned: ${await connection.getUserItemCount(context.member, item_id + 1)})`,
                    color: 16768768,
                    footer: {
                        icon_url: context.member.user.avatarURL(),
                        text: `${context.member.user.username}'s BlobCoins: ${userData.currency}`
                    },
                    fields: fields
                }
            });
            await itemOptionsMenu();
            async function itemOptionsMenu() {
                const filter = (reaction, user) => user.id === context.member.user.id;
                await store_message.awaitReactions(filter, { max: 1, time: 120000 })
                    .then(async collected => {
                        const reaction = collected.first();
                        if (!reaction) { // timed out
                            return;
                        }
                        await reaction.users.remove(context.member.user);
                        switch (reaction.emoji.name) {
                            case emojis[0]:
                                await buyConfirmation(item, 1);
                                break;
                            case emojis[1]:
                                await buyConfirmation(item, 5);
                                break;
                            case emojis[2]:
                                await buyConfirmation(item, 10);
                                break;
                            case emojis[3]:
                                await updateStoreList();
                                await storeNavigation();
                                break;
                            case emojis[4]:
                                // TODO: find blobs for this move
                                break;
                            case emojis[5]:
                                await showItem(Math.max(0, item_id - 1));
                                break;
                            case emojis[6]:
                                await showItem(Math.min(store_items.length - 1, item_id + 1));
                                break;
                            case emojis[7]:
                                return;
                        }
                    })
                    .catch(console.error);
            }
        }

        async function buyConfirmation(item, quantity) {
            await store_message.edit({
                embed: {
                    title: 'Confirm Purchase?',
                    description: `Are you sure you want to purchase ${quantity}x ${item.name}(s) for ${item.value * quantity}?`,
                    color: 4289797,
                    footer: {
                        icon_url: context.member.user.avatarURL(),
                        text: `${context.member.user.username}'s BlobCoins: ${userData.currency}`
                    },
                    fields: [
                        {
                            name: 'Options',
                            value: `${emojis[0]}Confirm ${emojis[1]}Cancel`
                        }
                    ]
                }
            });
            await purchaseOptionsMenu();

            async function purchaseOptionsMenu() {
                const filter = (reaction, user) => user.id === context.member.user.id;
                await store_message.awaitReactions(filter, { max: 1, time: 120000 })
                    .then(async collected => {
                        const reaction = collected.first();
                        if (!reaction) { // timed out
                            return;
                        }
                        await reaction.users.remove(context.member.user);
                        switch (reaction.emoji.name) {
                            case emojis[0]:
                                if (userData.currency < item.value * quantity) {
                                    await denyPurchase();
                                    return;
                                }
                                else {
                                    await acceptPurchase(item, quantity);
                                }
                                break;
                            case emojis[1]:
                                await showItem(item.id - 1);
                                break;
                            case emojis[7]:
                                return;
                            default:
                                await purchaseOptionsMenu();
                        }
                    })
                    .catch(console.error);
            }
        }

        async function denyPurchase() {
            await store_message.edit({
                embed: {
                    title: 'Transaction Denied',
                    description: `You do not have enough BlobCoins for this item.`,
                    color: 13632027,
                    footer: {
                        icon_url: context.member.user.avatarURL(),
                        text: `${context.member.user.username}'s BlobCoins: ${userData.currency}`
                    },
                }
            });

            await sleep(5000);
            await updateStoreList();
            await storeNavigation();
        }

        async function acceptPurchase(item, quantity) {
            await connection.giveUserItem(context.member, item.id, quantity);
            userData.currency = (await connection.modifyCoinsTracked(context.member, -item.value * quantity)).currency;
            await store_message.edit({
                embed: {
                    title: 'Transaction Accepted',
                    description: `You have purchased ${quantity}x ${item.name}(s) for ${item.value * quantity}!`,
                    color: 8311585,
                    footer: {
                        icon_url: context.member.user.avatarURL(),
                        text: `${context.member.user.username}'s BlobCoins: ${userData.currency}`
                    },
                }
            });
            await sleep(5000);
            await updateStoreList();
            await storeNavigation();
        }

        async function updateStoreList() {
            let item_list = '\`\`\`md\n#  Name         Price  Type\n';
            for (let index = 0; index < 5; index++) {
                let item_index = index + 5 * (page - 1);
                if (item_index == store_items.length)
                    break;
                let item = store_items[item_index];
                let str = '';
                item_list += (index + 1) + '. ';
                str = item.name.split(':');
                str = str[str.length - 1].trim();
                item_list += str.length > 13 ? str.substring(0, 10).trimRight() + '...' : str + ' '.repeat(13 - str.length);
                str = item.value + '';
                item_list += str + ' '.repeat(7 - str.length);
                str = item.category;
                item_list += str;
                item_list += '\n'
            }
            item_list += '\`\`\`';
            await store_message.edit({
                embed: {
                    title: 'Shop',
                    description: `Select an item to display more information.⠀⠀⠀⠀⠀⠀\n${item_list} \nPage ${page}/${max_pages}`,
                    color: 16768768,
                    thumbnail: {
                        url: 'https://cdn.discordapp.com/attachments/542422265254641674/547137981841014785/BattleBlobsShop.png'
                    },
                    footer: {
                        icon_url: context.member.user.avatarURL(),
                        text: `${context.member.user.username}'s BlobCoins: ${userData.currency}`
                    }
                }
            });
        }
        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }
}


module.exports = Store;
