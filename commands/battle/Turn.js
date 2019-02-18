class Turn {
    constructor(player, type, action, controller) {
        this.player = player;
        this.type = type;
        this.action = action;
        this.controller = controller;
    }

    async play(turn) {

        switch (this.type) {
            case this.controller.ActionType.MOVE:
                await this.useMove(this.action, turn);
                break;
            case this.controller.ActionType.ITEM:
                // TODO: add use item
                break;
            case this.controller.ActionType.SWITCH:
                await this.player.blobMenu(await this.controller.battle_message.switchBlobMenu(this.player));
                break;
            case this.controller.ActionType.RUN:
                await this.controller.battle_message.log(`${this.player.name} has forfeited the battle!`)
                await this.controller.endGame(this.controller.players[turn], false);
                return;
                break;
        }
    }
    async useMove(move, player) {
        let blobs = [player.selected_blob, player.opponent.selected_blob]
        let prefixes = []
        if (move == null) {
            // struggle
            move = {
                move_name: 'Struggle',
                damage: 50,
                accuracy: 100,
                max_pp: 0,
                stat_type1: 6,
                stat_boost1: 0,
                stat_type2: 6,
                stat_boost2: 0,
                enemy_stat_type1: 6,
                enemy_stat_debuff1: 0,
                enemy_stat_type2: 6,
                enemy_stat_debuff2: 0,
                recoil: .25,
                status_effect: 1,
                self_status: false,
                additional_effect: 'None'
            };
        }
        if (player == this.controller.players[0]) {
            prefixes.push('+');
            prefixes.push('-');
        }
        else {
            prefixes.push('-');
            prefixes.push('+');
        }
        let attack_ability = await this.processStatusEffects(blobs, prefixes, player);

        if (!attack_ability.can_attack)
            return;

        if (Math.random() > move.accuracy) {
            await this.controller.battle_message.log(`${prefixes[0]} ${blobs[0].emoji_name} used ${move.move_name}!`, true, 2000);
            await this.controller.battle_message.log(`${prefixes[1]} ${blobs[1].emoji_name} avoided the attack.`, true);
            return;
        }

        let damage_dealt = Math.ceil(attack_ability.attack_power * ((2 * blobs[0].blob_level / 5 + 2) * move.damage * blobs[0].cur_stats[0] / blobs[1].cur_stats[1]) / 50);

        blobs[1].health -= damage_dealt;
        move.pp--;

        if (damage_dealt > 0)
            await this.controller.battle_message.log(`${prefixes[0]} ${blobs[0].emoji_name} used ${move.move_name} doing ${damage_dealt} damage to ${blobs[1].emoji_name}!`, true);
        else
            await this.controller.battle_message.log(`${prefixes[0]} ${blobs[0].emoji_name} used ${move.move_name}!`, true);

        if (move.recoil > 0) {
            blobs[0].health -= Math.floor(blobs[0].vitality * move.recoil);

            await this.controller.battle_message.log(`${prefixes[0]} ${blobs[0].emoji_name} toke some recoil damage.`, true);
        }
        if (move.recoil < 0) {
            blobs[0].health = Math.min(blobs[0].vitality, blobs[0].health - Math.floor(blobs[0].vitality * move.recoil));

            await this.controller.battle_message.log(`${prefixes[0]} ${blobs[0].emoji_name} has regained some health.`, true);
        }

        let suffixes = ['harshly fell', 'sharply fell', 'fell', '', 'rose', 'sharply rose', 'rose drastically'];

        let stat_changes_message = `${prefixes[1]} ${blobs[1].emoji_name}'s`;
        let stat_changes_array = [
            [move.enemy_stat_type1, -move.enemy_stat_debuff1],
            [move.enemy_stat_type2, -move.enemy_stat_debuff2]
        ];
        for (let i = 1; i >= 0; i--) {
            stat_changes_array.forEach(x => {
                if (this.controller.stat_types[x[0] - 1].stat_name != 'None') {
                    const stage_index = x[0] - 2;
                    const stat = this.controller.stat_types[x[0] - 1].stat_name;
                    if (Math.abs(blobs[i].stages[stage_index]) == 6 && Math.abs(blobs[i].stages[stage_index] + x[1]) > 6) {
                        stat_changes_message += ` ${stat} cannot go any further,`;
                    }
                    else {
                        stat_changes_message += ` ${stat} ${suffixes[x[1] + 3]},`;
                    }
                    if (blobs[i].stages[stage_index] + x[1] > 6) {
                        blobs[i].stages[stage_index] = 6;
                    }
                    else if (blobs[i].stages[stage_index] + x[1] < -6) {
                        blobs[i].stages[stage_index] = -6;
                    }
                    else {
                        blobs[i].stages[stage_index] += x[1];
                    }
                    const base_stats = [blobs[i].attack, blobs[i].defense, blobs[i].speed];
                    if (blobs[i].stages[stage_index] + x[1] < 0) {
                        blobs[i].cur_stats[stage_index] = Math.floor(2 / (2 - blobs[i].stages[stage_index]) * base_stats[stage_index]);
                    }
                    else {
                        blobs[i].cur_stats[stage_index] = Math.floor((2 + blobs[i].stages[stage_index]) / 2 * base_stats[stage_index]);
                    }
                }
            });
            if (stat_changes_message.charAt(stat_changes_message.length - 1) == ',') {
                stat_changes_message = stat_changes_message.substr(0, stat_changes_message.length - 1) + '!';
                stat_changes_message = stat_changes_message.replace(',', ' and');
                await this.controller.battle_message.log(stat_changes_message, true);
            }
            stat_changes_message = `${prefixes[0]} ${blobs[0].emoji_name}'s`;
            stat_changes_array = [
                [move.stat_type1, move.stat_boost1],
                [move.stat_type2, move.stat_boost2]
            ];
        }
        if (await this.checkFaintStatus(player))
            return;


        const current_status = this.controller.status_types[move.status_effect - 1];
        if (current_status.stat_name != 'None' && move.status_chance > Math.random()) {
            if (move.self_status && blobs[0].statuses.every(x => move.status_effect != x.effect_id)) {
                blobs[0].statuses.push({
                    effect_id: move.status_effect,
                    remove_turn: Math.floor(Math.random() * (current_status.max_turns - current_status.min_turns)) + current_status.min_turns,
                    current_turn: 0
                });
                await this.addStatusEffect(blobs, prefixes, current_status)
            }
            if (!move.self_status && blobs[1].statuses.every(x => move.status_effect != x.effect_id)) {
                blobs[1].statuses.push({
                    effect_id: move.status_effect,
                    remove_turn: Math.floor(Math.random() * (current_status.max_turns - current_status.min_turns)) + current_status.min_turns,
                    current_turn: 0
                });
                await this.addStatusEffect(blobs, prefixes, current_status)
            }
        }


    }
    async addStatusEffect(blobs, prefixes, effect) {
        if (effect.name == 'Transformed') {
            // Transform
            blobs[0].move_one.max_pp--;
            await this.controller.connection.updateBattleBlob(blobs[0]);
            blobs[0].move_one = Object.assign({}, blobs[1].move_one);
            blobs[0].move_one.pp = 5;
            blobs[0].move_two = Object.assign({}, blobs[1].move_two);
            blobs[0].move_two.pp = 5;
            blobs[0].move_three = Object.assign({}, blobs[1].move_three);
            blobs[0].move_three.pp = 5;
            blobs[0].move_four = Object.assign({}, blobs[1].move_four);
            blobs[0].move_four.pp = 5;
            blobs[0].emoji = blobs[1].emoji;
        }
        blobs[1].statuses.sort((x, y) => { return x.priority - y.priority; });
        await this.controller.battle_message.log(`${prefixes[1]} ${blobs[1].emoji_name} ${effect.addition_text}`, true);
        return;
    }
    async processStatusEffects(blobs, prefixes, player) {

        let attack_ability = { can_attack: true, attack_power: 1 };
        for (let i = 0; i < blobs[0].statuses.length; i++) {
            if (blobs[0].statuses[i].effect_id == 1) {
                // No status effect
                continue;
            }

            const current_status = this.controller.status_types[blobs[0].statuses[i].effect_id - 1];


            blobs[0].statuses[i].current_turn++;

            if (current_status.status_text != 'null' && attack_ability.can_attack) {
                await this.controller.battle_message.log(`${prefixes[0]} ${blobs[0].emoji_name} ${current_status.status_text}`, true, 1500);
            }

            if (blobs[0].statuses[i].remove_turn == blobs[0].statuses[i].current_turn) {
                await this.controller.battle_message.log(`${prefixes[0]} ${blobs[0].emoji_name} ${current_status.removal_text}`, true, 1500);
                blobs[0].statuses.splice(i, 1);
                if (current_status.id == 9) {
                    // Revert transform
                    await copyBattleStats(await this.controller.connection.getBlob(blobs[0].unique_id), blobs[0]);
                }
                continue;
            }

            if (!attack_ability.can_attack || current_status.priority == -1)
                continue;

            if (current_status.skip_chance > 0 && current_status.skip_chance > Math.random()) {
                // skip turn status effects
                let dmg = Math.ceil(blobs[0].vitality * current_status.damage_per_turn);
                blobs[0].health -= dmg;
                if(current_status.effect_text != 'null')
                    await this.controller.battle_message.log(`${prefixes[0]} ${blobs[0].emoji_name} ${current_status.effect_text}`, true, 1500);
                attack_ability.can_attack = false;
            }
            else if (current_status.skip_chance == 0) {
                // damaging status effects
                let dmg = Math.ceil(blobs[0].vitality * current_status.damage_per_turn);
                blobs[0].health -= dmg;
                if (current_status.effect_text != 'null')
                    await this.controller.battle_message.log(`${prefixes[0]} ${blobs[0].emoji_name} ${current_status.effect_text}`, true, 1500);
            }

            // Special cases
            switch (blobs[0].statuses[i].effect_id) {
                case 2:
                    // Burn halves damag4e
                    attack_ability.attack_power = .5;
                    break;

            }

            if (await this.checkFaintStatus(player))
                return;
            

        }
        return attack_ability;
    }
}
module.exports = Turn;