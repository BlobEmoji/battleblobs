


const CommandBaseClass = require('../CommandBaseClass.js');

class Battle extends CommandBaseClass {
    constructor(...args) {
        super(...args);

        this.meta = {
            name: 'battle',
            category: 'meta.help.categories.battleblobs',
            description: 'meta.help.commands.battle',
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


        let players = [];
        let current_turn = 0;

        let battle_log = '';
        let battle_message;

        let menu_buttons = [];
        const number_emojis = ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '6⃣'];

        let game_over = false;
        const ActionType = { MOVE: 1, ITEM: 2, SWITCH: 3, RUN: 4 };
        let action_queue = [];

        let party = await connection.getParty(context.member);
        await connection.setEngaged(context.member, true);

        if (party.length != 6) {
            await context.send('You must create a party before you can start a battle.\n Try using `-choose`');
            return;
        }

        if (party.reduce(function (total, blob) { return total + blob.health; }, 0) <= 0) {
            await connection.setEngaged(context.member, false);
            await context.send('You do not have any blobs in battling condition.');
            return;
        }

        players.push({
            name: context.member.user.username,
            party: party,
            selected_blob: party.find(x => x.health > 0),
            member: context.member,
            isPlayer: true,
            ranking: userData.ranking,
        });


        let target_member = context.message.mentions.members.first();
        if (!target_member && !isNaN(context.args))
            target_member = context.guild.member(context.args);

        if (!target_member) {
            let enemy_party = await generateEnemyParty();
            players.push({
                name: 'Trainer',
                party: enemy_party,
                selected_blob: enemy_party[0],
                isPlayer: false,
            });

        }
        else {
            let targetData = await connection.memberData(target_member);

            let enemy_party = await connection.getParty(target_member);
            if (targetData.state_engaged) {
                await connection.setEngaged(context.member, false);
                await context.send('That player is busy.');
                return;
            }
            if (enemy_party.length != 6) {
                await connection.setEngaged(context.member, false);
                await context.send('That user has not created a party yet.');
                return;
            }
            if (enemy_party.reduce(function (total, blob) { return total + blob.health; }, 0) <= 0) {
                await connection.setEngaged(context.member, false);
                await context.send('That user does not have any blobs in battling condition.');
                return;
            }

            await connection.setEngaged(target_member, true);
            await context.send(`${target_member}, ${context.member.username} has challenged you to a battle!\n\`${context.prefix}accept\` or \`${context.prefix}decline\``);
            const re = new RegExp(`^(?:${context.client.prefixRegex})(accept|decline)(.*)$`);
            const filter = m => (m.author.id === target_member.id && re.test(m.content));
            let response;
            try {
                response = re.exec((await context.channel.awaitMessages(filter, { max: 1, time: 30000, errors: ['time'] })).first().content);
            } catch (e) {
                // user didnt respond                   
                await connection.setEngaged(context.member, false);
                await connection.setEngaged(target_member, false);
                return;
            }
            if (response[1] === 'decline') {
                await connection.setEngaged(context.member, false);
                await connection.setEngaged(target_member, false);
                return;
            }
            players.push({
                name: target_member.user.username,
                party: enemy_party,
                selected_blob: enemy_party.find(x => x.health > 0),
                member: target_member,
                isPlayer: true,
                ranking: targetData.ranking,
            });


        }
        for (let pi = 0; pi < players.length; pi++) {
            for (let bi = 0; bi < players[pi].party.length; bi++) {
                await addBattleStats(players[pi].party[bi]);
            }
            players[pi].total_worth = players[pi].party.reduce(function (total, blob) { return total + blob.worth; }, 0);
            
        }


        await battleLog(`+ You started a battle against ${players[1].name}!`);

        battle_message = await context.send(await getBattleMessage());

        for (let i = 0; i < 4; i++) {
            await battle_message.react(number_emojis[i]);
        }

        await playTurn();

        async function playTurn() {
            if (!players[current_turn].isPlayer)
                await playBotTurn();
            else
                await moveMenu();

            if (game_over)
                return;
            else
                await playTurn();
        }

        async function endGame(loser_number) {
            game_over = true;
            if (loser_number == -1) {
                // Draw
                await battleLog(`The battle has ended in a tie.`, true);
            }
            else {
                await battleLog(`${players[loser_number].name} has lost to ${players[Math.abs(loser_number - 1)].name}.`, true);
                await calculateReward(Math.abs(loser_number - 1));
            }
            await connection.setEngaged(context.member, false);
            if (players[1].isPlayer)
                await connection.setEngaged(target_member, false);

        }
        async function playBotTurn() {
            let moves = [
                players[current_turn].selected_blob.move_one,
                players[current_turn].selected_blob.move_two,
                players[current_turn].selected_blob.move_three,
                players[current_turn].selected_blob.move_four
            ];
            await queueAction(ActionType.MOVE, moves[Math.floor(Math.random() * 4)]);
        }
        async function optionMenu() {
            menu_buttons = ['Fight', 'Bag', 'Blobs', 'Run'];
            await battle_message.edit(await getBattleMessage());
            const filter = (reaction, user) => user.id === players[current_turn].member.user.id
            await battle_message.awaitReactions(filter, { max: 1, time: 120000 })
                .then(async collected => {
                    let reaction = collected.first();
                    if (!reaction) {
                        await battleLog('The battle has timed out.', true);
                        endGame(current_turn);
                        return;
                    }
                    await reaction.users.remove(players[current_turn].member.user);
                    switch (reaction.emoji.name) {
                        case number_emojis[0]:
                            await moveMenu();
                            break;
                        case number_emojis[1]:
                            // TODO: make a bag menu
                            break;
                        case number_emojis[2]:
                            await queueAction(ActionType.SWITCH);
                            break;
                        case number_emojis[3]:
                            await queueAction(ActionType.RUN);
                            break;

                    }
                })
                .catch(console.error);
        }
        async function moveMenu() {

            let moves = [
                players[current_turn].selected_blob.move_one,
                players[current_turn].selected_blob.move_two,
                players[current_turn].selected_blob.move_three,
                players[current_turn].selected_blob.move_four
            ];
            menu_buttons = [];
            moves.forEach(x => menu_buttons.push(x.move_name));
            menu_buttons.push('Back');
            battle_message.edit(await getBattleMessage());

            let temp_reaction = await battle_message.react(number_emojis[4]);

            let filter = (reaction, user) => user.id === players[current_turn].member.user.id;
            await battle_message.awaitReactions(filter, { max: 1, time: 120000 })
                .then(async collected => {
                    let reaction = collected.first();
                    if (!reaction) {
                        await battleLog('The battle has timed out.', true);
                        endGame(current_turn);
                        return;
                    }
                    reaction.users.remove(players[current_turn].member.user);
                    switch (reaction.emoji.name) {
                        case number_emojis[0]:
                            await queueAction(ActionType.MOVE, moves[0]);
                            break;
                        case number_emojis[1]:
                            await queueAction(ActionType.MOVE, moves[1]);
                            break;
                        case number_emojis[2]:
                            await queueAction(ActionType.MOVE, moves[2]);
                            break;
                        case number_emojis[3]:
                            await queueAction(ActionType.MOVE, moves[3]);
                            break;
                        case number_emojis[4]:
                            await temp_reaction.users.remove(context.client.user);
                            await optionMenu();
                            break;
                    }
                })
                .catch(console.error);




        }
        async function processActions() {
            let player_first;
            switch (action_queue[0].type) {
                case ActionType.MOVE:
                    switch (action_queue[1].type) {
                        case ActionType.MOVE:
                            if (players[0].selected_blob.cur_speed >= players[1].selected_blob.cur_speed)
                                player_first = 0;
                            else
                                player_first = 1;
                            break;
                        default:
                            player_first = 1;
                    }
                    break;
                case ActionType.ITEM:
                case ActionType.SWITCH:
                case ActionType.RUN:
                    player_first = 0;
            }
            for (let i = 0; i < action_queue.length; i++) {
                let turn = Math.abs(player_first - i);
                switch (action_queue[turn].type) {
                    case ActionType.MOVE:
                        await useMove(action_queue[turn].action, turn);
                        break;
                    case ActionType.ITEM:
                        // TODO: add use item
                        break;
                    case ActionType.SWITCH:
                        await switchBlobMenu(turn);
                        break;
                    case ActionType.RUN:
                        if (action_queue[Math.abs(turn - 1)].type == ActionType.RUN)
                            await endGame(-1);
                        else {
                            await battleLog(`${players[turn].name} has forfeited the battle!`)
                            await updateParty(turn);
                            await endGame(turn);
                        }
                        return;
                        break;
                }
            }

            action_queue = [];
        }

        async function queueAction(action_type, action = null) {
            await action_queue.push({ type: action_type, action: action });
            if (action_queue.length == 2) {
                await processActions();
            }
            current_turn = Math.abs(current_turn - 1);
        }

        async function interuptActions() {
            action_queue = [];
        }

        async function useMove(move, player_number) {
            let attacking = players[player_number].selected_blob;
            let target = players[Math.abs(player_number - 1)].selected_blob;
            let attacking_prefix;
            let target_prefix;
            if (player_number == 0) {
                attacking_prefix = '+';
                target_prefix = '-';
            }
            else {
                attacking_prefix = '-';
                target_prefix = '+';
            }
            switch (attacking.status) {
                case 'Burn':
                    attacking.health -= Math.floor(attacking.vitality / 8);
                    await battleLog(`${attacking_prefix} ${attacking.emoji_name} is hurt by its burn!`, true);
                    attacking.status_turns -= 1;
                    if (attacking.status_turns == 0)
                        attacking.status = 'None';
                    if (await checkFaintStatus(player_number))
                        return;
                    break;
                case 'Sleep':
                    await battleLog(`${attacking_prefix} ${attacking.emoji_name} is fast asleep!`, true);
                    attacking.status_turns -= 1;
                    if (attacking.status_turns == 0) {
                        attacking.status = 'None';
                        await battleLog(`${attacking_prefix} ${attacking.emoji_name} woke up!`, true);
                    }
                    else
                        return;
                    break;
            }

            if (Math.random > move.accuracy) {
                await battleLog(`${target_prefix} ${target.emoji_name} avoided the attack.`, true);
                return;
            }

            let damage_dealt = Math.ceil(((2 * attacking.blob_level / 5 + 2) * move.damage * attacking.cur_attack / target.cur_defense) / 50);

            target.health -= damage_dealt;


            if (damage_dealt > 0)
                await battleLog(`${attacking_prefix} ${attacking.emoji_name} used ${move.move_name} doing ${damage_dealt} damage to ${target.emoji_name}!`, true);
            else
                await battleLog(`${attacking_prefix} ${attacking.emoji_name} used ${move.move_name}!`, true);

            if (move.recoil > 0) {
                attacking.health -= Math.floor(attacking.vitality * move.recoil);

                await battleLog(`${attacking_prefix} ${attacking.emoji_name} toke some recoil damage.`, true);
            }

            let suffixes = ['harshly fell', 'sharply fell', 'fell', '', 'rose', 'sharply rose', 'rose drastically'];

            let stat_changes_message = `${target_prefix} ${target.emoji_name}`;
            let stat_changes_array = [-move.attack_debuff, -move.defense_debuff, -move.speed_debuff];

            if (stat_changes_array.filter(x => x != 0).length != 0) {
                if (stat_changes_array[0] != 0) {
                    if (Math.abs(target.cur_attack_stage) == 6 && Math.abs(target.cur_attack_stage + stat_changes_array) > 6) {
                        stat_changes_message += ' attack cannot go any further,'
                    }
                    else {
                        stat_changes_message += ' attack ' + suffixes[stat_changes_array[0] + 3] + ',';
                    }
                    if (target.cur_attack_stage + stat_changes_array[0] > 6) {
                        target.cur_attack_stage = 6;
                    }
                    else if (target.cur_attack_stage + stat_changes_array[0] < -6) {
                        target.cur_attack_stage = -6;
                    }
                    else {
                        target.cur_attack_stage += stat_changes_array[0];
                    }

                    if (target.cur_attack_stage + stat_changes_array[0] < 0) {
                        target.cur_attack = Math.floor(2 / (2 - target.cur_attack_stage) * target.attack);
                    }
                    else {
                        target.cur_attack = Math.floor((2 + target.cur_attack_stage) / 2 * target.attack);
                    }

                }
                if (stat_changes_array[1] != 0) {
                    if (Math.abs(target.cur_defense_stage) == 6 && Math.abs(target.cur_defense_stage + stat_changes_array) > 6) {
                        stat_changes_message += ' defense cannot go any further,'
                    }
                    else {
                        stat_changes_message += ' defense ' + suffixes[stat_changes_array[1] + 3] + ',';
                    }
                    if (target.cur_defense_stage + stat_changes_array[1] > 6) {
                        target.cur_defense_stage = 6;
                    }
                    else if (target.cur_defense_stage + stat_changes_array[1] < -6) {
                        target.cur_defense_stage = -6;
                    }
                    else {
                        target.cur_defense_stage += stat_changes_array[1];
                    }

                    if (target.cur_defense_stage + stat_changes_array[1] < 0) {
                        target.cur_defense = Math.floor(2 / (2 - target.cur_defense_stage) * target.defense);
                    }
                    else {
                        target.cur_defense = Math.floor((2 + target.cur_defense_stage) / 2 * target.defense);
                    }
                }
                if (stat_changes_array[2] != 0) {
                    if (Math.abs(target.cur_speed_stage) == 6 && Math.abs(target.cur_speed_stage + stat_changes_array) > 6) {
                        stat_changes_message += ' speed cannot go any further,'
                    }
                    else {
                        stat_changes_message += ' speed ' + suffixes[stat_changes_array[2] + 3] + ',';
                    }
                    if (target.cur_speed_stage + stat_changes_array[2] > 6) {
                        target.cur_speed_stage = 6;
                    }
                    else if (target.cur_speed_stage + stat_changes_array[2] < -6) {
                        target.cur_speed_stage = -6;
                    }
                    else {
                        target.cur_speed_stage += stat_changes_array[2];
                    }

                    if (target.cur_speed_stage + stat_changes_array[2] < 0) {
                        target.cur_speed = Math.floor(2 / (2 - target.cur_speed_stage) * target.speed);
                    }
                    else {
                        target.cur_speed = Math.floor((2 + target.cur_speed_stage) / 2 * target.speed);
                    }
                }
                stat_changes_message = stat_changes_message.substr(0, stat_changes_message.length - 1) + '!';
                await battleLog(stat_changes_message, true);
            }

            stat_changes_message = `${attacking_prefix} ${attacking.emoji_name}`;
            stat_changes_array = [move.attack_boost, move.defense_boost, move.speed_boost];

            if (stat_changes_array.filter(x => x != 0).length != 0) {
                if (stat_changes_array[0] != 0) {
                    if (Math.abs(attacking.cur_attack_stage) == 6 && Math.abs(attacking.cur_attack_stage + stat_changes_array) > 6) {
                        stat_changes_message += ' attack cannot go any further,'
                    }
                    else {
                        stat_changes_message += ' attack ' + suffixes[stat_changes_array[0] + 3] + ',';
                    }
                    if (attacking.cur_attack_stage + stat_changes_array[0] > 6) {
                        attacking.cur_attack_stage = 6;
                    }
                    else if (attacking.cur_attack_stage + stat_changes_array[0] < -6) {
                        attacking.cur_attack_stage = -6;
                    }
                    else {
                        attacking.cur_attack_stage += stat_changes_array[0];
                    }

                    if (attacking.cur_attack_stage + stat_changes_array[0] < 0) {
                        attacking.cur_attack = Math.floor(2 / (2 - attacking.cur_attack_stage) * attacking.attack);
                    }
                    else {
                        attacking.cur_attack = Math.floor((2 + attacking.cur_attack_stage) / 2 * attacking.attack);
                    }

                }
                if (stat_changes_array[1] != 0) {
                    if (Math.abs(attacking.cur_defense_stage) == 6 && Math.abs(attacking.cur_defense_stage + stat_changes_array) > 6) {
                        stat_changes_message += ' defense cannot go any further,'
                    }
                    else {
                        stat_changes_message += ' defense ' + suffixes[stat_changes_array[1] + 3] + ',';
                    }
                    if (attacking.cur_defense_stage + stat_changes_array[1] > 6) {
                        attacking.cur_defense_stage = 6;
                    }
                    else if (attacking.cur_defense_stage + stat_changes_array[1] < -6) {
                        attacking.cur_defense_stage = -6;
                    }
                    else {
                        attacking.cur_defense_stage += stat_changes_array[1];
                    }

                    if (attacking.cur_defense_stage + stat_changes_array[1] < 0) {
                        attacking.cur_defense = Math.floor(2 / (2 - attacking.cur_defense_stage) * attacking.defense);
                    }
                    else {
                        attacking.cur_defense = Math.floor((2 + attacking.cur_defense_stage) / 2 * attacking.defense);
                    }
                }
                if (stat_changes_array[2] != 0) {
                    if (Math.abs(attacking.cur_speed_stage) == 6 && Math.abs(attacking.cur_speed_stage + stat_changes_array) > 6) {
                        stat_changes_message += ' speed cannot go any further,'
                    }
                    else {
                        stat_changes_message += ' speed ' + suffixes[stat_changes_array[2] + 3] + ',';
                    }
                    if (attacking.cur_speed_stage + stat_changes_array[2] > 6) {
                        attacking.cur_speed_stage = 6;
                    }
                    else if (attacking.cur_speed_stage + stat_changes_array[2] < -6) {
                        attacking.cur_speed_stage = -6;
                    }
                    else {
                        attacking.cur_speed_stage += stat_changes_array[2];
                    }

                    if (attacking.cur_speed_stage + stat_changes_array[2] < 0) {
                        attacking.cur_speed = Math.floor(2 / (2 - attacking.cur_speed_stage) * attacking.speed);
                    }
                    else {
                        attacking.cur_speed = Math.floor((2 + attacking.cur_speed_stage) / 2 * attacking.speed);
                    }
                }
                stat_changes_message = stat_changes_message.substr(0, stat_changes_message.length - 1) + '!';
                await battleLog(stat_changes_message, true);
            }

            if (move.status_effect != 'None' && target.status == 'None') {
                target.status = move.status_effect;
                target.status_turns = move.status_turns;
            }

            await checkFaintStatus(player_number);
        }

        async function checkFaintStatus(player_number) {
            players.forEach(p => p.party.forEach(x => x.health = x.health < 0 ? 0 : x.health));
            let ret_val = false;
            if (players[Math.abs(player_number - 1)].selected_blob.health <= 0) {
                await interuptActions();
            }
            if (players[1].selected_blob.health <= 0 && !players[1].isPlayer) {
                // bot blob faints
                let temp = players[1].selected_blob;
                let gained_exp = Math.ceil(((1.5 * (Math.random() * 100) * temp.blob_level) / 7));
                let total_exp = parseInt((await connection.giveBlobExperience(players[0].selected_blob, gained_exp)).experience);
                if (Math.floor(Math.cbrt(total_exp)) > players[0].selected_blob.blob_level) {
                    let new_blob = await addBattleStats(await connection.getBlob((await connection.setBlobLevel(players[0].selected_blob, Math.floor(Math.cbrt(total_exp)))).unique_id));
                    players[0].party[players[0].selected_blob.slot] = new_blob;
                    players[0].selected_blob = new_blob;
                    await battleLog(`${players[0].selected_blob.emoji_name} has gained ${gained_exp} exp. (0 more exp to level up)`)
                    await battleLog(`${players[0].selected_blob.emoji_name} is now level ${players[0].selected_blob.blob_level}!`, true);
                }
                else {
                    await battleLog(`${players[0].selected_blob.emoji_name} has gained ${gained_exp} exp. (${Math.pow(players[0].selected_blob.blob_level + 1, 3) - total_exp} more exp to level up)`, true, 1500)
                }
                if (players[1].party.length == 0) {
                    await updateParty(0);
                    await endGame(1);
                    return true;
                }
                players[1].selected_blob = players[1].party.find(x => x.health > 0);
                await battleLog(`${players[1].name} sent out ${players[1].selected_blob.emoji_name}!`, true);
                ret_val = true;
            }

            if (players[player_number].selected_blob.health <= 0 && players[player_number].isPlayer) {
                // current blob faints
                await battleLog(`${players[player_number].name}'s ${players[player_number].selected_blob.emoji_name} has fainted.`, true, 2000);
                if (!players[player_number].party.some(x => x.health > 0)) {
                    await updateParty(0);
                    await updateParty(1);
                    await endGame(player_number);
                    return true;
                }
                await switchBlobMenu(player_number);
                ret_val = true;
            }

            if (players[Math.abs(player_number - 1)].selected_blob.health <= 0 && players[Math.abs(player_number - 1)].isPlayer) {
                // enemy blob faints
                await battleLog(`${players[Math.abs(player_number - 1)].name}'s ${players[Math.abs(player_number - 1)].selected_blob.emoji_name} has fainted.`, true, 2000);
                if (!players[Math.abs(player_number - 1)].party.some(x => x.health > 0)) {
                    await updateParty(0);
                    await updateParty(1);
                    await endGame(Math.abs(player_number - 1));
                    return true;
                }
                await switchBlobMenu(Math.abs(player_number - 1));
                ret_val = true;
            }
            return ret_val;
        }

        async function calculateReward(player_won_number) {
            let trophies_awards = [0, 0];

            if (!players[1].isPlayer && player_won_number == 0) {
                let reward_money = Math.max(10, players[1].total_worth - players[0].total_worth);
                trophies_awards[0] = Math.min(15, reward_money);
                await connection.modifyCoinsTracked(players[0].member, reward_money);
                await connection.modifyRanking(players[0].member, trophies_awards[0]);
                await battleLog(`${players[0].name} has earned ${reward_money} blob coins and ${trophies_awards[0]} trophies.`, true);
            }
            else if (players[1].isPlayer) {
                let ranking_difference = players[player_won_number].ranking - players[Math.abs(player_won_number - 1)].ranking;
                trophies_awards[player_won_number] = Math.max(5, Math.floor(-0.0794 * ranking_difference + 29.35838));
                trophies_awards[Math.abs(player_won_number - 1)] = Math.min(-5, Math.floor(-(0.0531 * (-ranking_difference) + 19.60453)));
                trophies_awards[Math.abs(player_won_number - 1)] = players[Math.abs(player_won_number - 1)].ranking + trophies_awards[Math.abs(player_won_number - 1)] < 0 ? -players[Math.abs(player_won_number - 1)].ranking : trophies_awards[Math.abs(player_won_number - 1)];
                await connection.modifyRanking(players[player_won_number].member, trophies_awards[player_won_number]);
                await connection.modifyRanking(players[Math.abs(player_won_number - 1)].member, trophies_awards[Math.abs(player_won_number - 1)]);
                await battleLog(`${players[player_won_number].name} has gained ${trophies_awards[player_won_number]} trophies.`);
                await battleLog(`${players[Math.abs(player_won_number - 1)].name} has lost ${Math.abs(trophies_awards[Math.abs(player_won_number - 1)])} trophies.`, true);
            }
        }

        async function switchBlobMenu(player_number) {
            let fields_array = [];
            let valid_reactions = [];

            for (let index = 0; index < players[player_number].party.length; index++) {
                await fields_array.push({
                    name: number_emojis[index] + players[player_number].party[index].emoji,
                    value: `\`${'█'.repeat(Math.max(0, players[player_number].party[index].health) / players[player_number].party[index].vitality * 10) + '-'.repeat(10 - Math.max(0, players[player_number].party[index].health) / players[player_number].party[index].vitality * 10)}\` ${Math.max(0, players[player_number].party[index].health)}/${players[player_number].party[index].vitality} Lv. ${players[player_number].party[index].blob_level}`,
                    inline: true
                });
                if (players[player_number].party[index].health > 0) {
                    await valid_reactions.push(index);
                }
            }

            await battle_message.edit({
                embed: {
                    title: `${players[player_number].name}'s Party`,
                    footer: {
                        text: "Use one of the reactions at the bottom to select your next blob."
                    },
                    fields: fields_array
                }
            });
            let temp_reactions = [
                await battle_message.react(number_emojis[5])
            ];

            const filter = (reaction, user) => user.id === players[player_number].member.user.id;
            let ended_turn = false;
            await selectBlobMenu();

            async function selectBlobMenu() {
                await battle_message.awaitReactions(filter, { max: 1, time: 120000 })
                    .then(async collected => {
                        let reaction = collected.first();
                        if (!reaction) {
                            players[player_number].selected_blob = players[player_number].party[valid_reactions[0]];
                            temp_reactions.forEach(async r => await r.users.remove(context.client.user));
                            ended_turn = true;
                        }
                        let selected_reaction = valid_reactions.find(y => reaction.emoji.name == number_emojis[y]);
                        if (selected_reaction >= 0) {
                            players[player_number].selected_blob = players[player_number].party[selected_reaction];
                            await battleLog(`${players[player_number].name} sent out ${players[player_number].selected_blob.emoji_name}!`, true);
                            temp_reactions.forEach(async r => await r.users.remove(context.client.user));
                            ended_turn = true;
                        }
                        await reaction.users.remove(players[player_number].member.user);
                        if (!ended_turn) {
                            await selectBlobMenu();
                        }
                    })
                    .catch(console.error);
            }
        }

        async function battleLog(str, doUpdate = false, time = 1000) {
            let log_lines = battle_log.split('\n');
            if (log_lines.length > 5) {
                battle_log = '';
                for (let i = 1; i < log_lines.length - 1; i++) {
                    battle_log += log_lines[i] + '\n';
                }
                battle_log += log_lines[log_lines.length - 1];
            }
            battle_log += str + '\n';
            if (doUpdate) {
                await battle_message.edit(await getBattleMessage());
                await sleep(time);
            }
        }

        async function getBattleMessage() {
            let party_field_array = ['', ''];
            for (let pi = 0; pi < players.length; pi++) {
                for (let bi = 0; bi < 6; bi++) {
                    let bullet = '•';
                    if (players[pi].party[bi].slot == players[pi].selected_blob.slot) {
                        bullet = '__' + bullet + '__';
                    }
                    if (players[pi].party[bi].health > 0) {
                        bullet = '**' + bullet + '**';
                    }
                    party_field_array[pi] += bullet + ' ';
                }
            }

            let fields_array = [
                {
                    name: "Battle Log",
                    value: `\`\`\`diff\n${battle_log}\`\`\``
                },
                {
                    name: "⠀",
                    value: "⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
                    inline: true
                },
                {
                    name: `Lv. ${players[1].selected_blob.blob_level}⠀⠀⠀⠀⠀⠀⠀⠀⠀${players[1].selected_blob.emoji}`,
                    value: `\`${'█'.repeat(Math.max(0, players[1].selected_blob.health) / players[1].selected_blob.vitality * 15) + '-'.repeat(15 - Math.max(0, players[1].selected_blob.health) / players[1].selected_blob.vitality * 15)}\` ${Math.max(0, players[1].selected_blob.health)}/${players[1].selected_blob.vitality}`,
                    inline: true
                },
                {
                    name: `${players[0].selected_blob.emoji}⠀⠀⠀⠀⠀⠀⠀⠀⠀Lv. ${players[0].selected_blob.blob_level}`,
                    value: `\`${'█'.repeat(Math.max(0, players[0].selected_blob.health) / players[0].selected_blob.vitality * 15) + '-'.repeat(15 - Math.max(0, players[0].selected_blob.health) / players[0].selected_blob.vitality * 15)}\` ${Math.max(0, players[0].selected_blob.health)}/${players[0].selected_blob.vitality}⠀⠀⠀⠀⠀`,
                    inline: true
                },
                {
                    name: "⠀",
                    value: `\`\`\`${players[current_turn].name}'s Turn\`\`\``
                }
            ]
            for (let i = 0; i < menu_buttons.length; i++) {
                if (i == 2)
                    fields_array.push({
                        name: '⠀',
                        value: '⠀',
                        inline: true
                    });
                fields_array.push({
                    name: number_emojis[i] + ' ' + menu_buttons[i],
                    value: '⠀',
                    inline: true
                });
            }

            return {
                embed: {
                    author: {
                        name: `${players[0].name} vs ${players[1].name}`
                    },
                    description: `${party_field_array[0]} vs ${party_field_array[1]}`,
                    fields: fields_array
                }
            };
        }

        async function generateEnemyParty() {
            let enemy_party = [];
            let total = 0;
            let lowest_level = 100;
            let highest_level = 0;
            let average_level, trimmed_average_level;
            players[0].party.forEach(function (blob) {
                total += blob.blob_level;
                if (blob.blob_level > highest_level)
                    highest_level = blob.blob_level;
                if (blob.blob_level < lowest_level)
                    lowest_level = blob.blob_level;
            });
            average_level = Math.floor(total / 6);
            trimmed_average_level = Math.floor((total - highest_level - lowest_level) / 4);
            for (let i = 0; i < 6; i++) {
                switch (Math.floor(Math.random() * 6)) {
                    case 0:
                        enemy_party.push(await blobBuilder(highest_level));
                        break;
                    case 1:
                    case 2:
                        enemy_party.push(await blobBuilder(average_level));
                        break;
                    case 3:
                    case 4:
                        enemy_party.push(await blobBuilder(trimmed_average_level));
                        break;
                    case 5:
                        enemy_party.push(await blobBuilder(lowest_level));
                        break;

                }
                enemy_party[i].slot = i;
            }
            return enemy_party;
        }

        async function blobBuilder(level) {
            let random_level = Math.ceil(Math.random() * Math.sqrt(level) - Math.sqrt(level)) + level;
            let hp_stat = Math.floor((2 * 30 + (Math.random() * 32)) * random_level / 100 + random_level + 10);
            let random_blob = await connection.generateRandomBlob();
            let ret_val = {
                    vitality: hp_stat,
                    health: hp_stat,
                    attack: Math.floor((2 * 30 + (Math.random() * 32)) * random_level / 100 + 5),
                    defense: Math.floor((2 * 30 + (Math.random() * 32)) * random_level / 100 + 5),
                    speed: Math.floor((2 * 30 + (Math.random() * 32)) * random_level / 100 + 5),
                    move_one: await connection.getRandomBlobAttackMove(),
                    move_two: await connection.getRandomBlobMove(),
                    move_three: await connection.getRandomBlobMove(),
                    move_four: await connection.getRandomBlobMove(),
                    blob_level: random_level,
                    emoji_id: random_blob.emoji_id,
                    emoji_name: random_blob.emoji_name
                }
            
            return ret_val;
        }

        async function addBattleStats(blob) {
            blob.cur_attack = blob.attack;
            blob.cur_attack_stage = 0;
            blob.cur_defense = blob.speed;
            blob.cur_defense_stage = 0;
            blob.cur_speed = blob.speed;
            blob.cur_speed_stage = 0;
            blob.status = 'None';
            blob.status_turns = 0;
            blob.worth = blob.blob_level;
            blob.move_one = await connection.getMove(blob.move_one);
            blob.move_two = await connection.getMove(blob.move_two);
            blob.move_three = await connection.getMove(blob.move_three);
            blob.move_four = await connection.getMove(blob.move_four);
            let emoji;
            if (emoji = context.client.emojis.find(emoji => emoji.id == blob.emoji_id)) {
                blob.emoji = `${emoji}`;
            }
            else {
                // if the emoji is not found
                blob.emoji = `:${blob.emoji_name}:`;
            }
            return blob;
        }
        async function updateParty(player_number) {
            players[player_number].party.forEach(async x => {
                await connection.updateBlobHealth(x);
            });
        }
        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }
}



module.exports = Battle;
