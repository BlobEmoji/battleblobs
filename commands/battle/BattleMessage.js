const BattleController = require('./BattleController.js');
class BattleMessage {
    constructor(battle_message, controller) {
        this.battle_message = battle_message;
        this.controller = controller;
        this.battle_log = '';
    }

    async setup() {
        for (let i = 0; i < 4; i++) {
            await this.battle_message.react(this.controller.number_emojis[i]);
        }
        await this.log(`+ You started a battle against ${this.controller.players[1].name}!`, true, 2000);
    }
    async showOptionMenu() {
        this.controller.menu_buttons = ['Fight', 'Bag', 'Blobs', 'Run'];
        this.controller.menu_button_descriptions = ['', '', this.controller.players[this.controller.current_turn].selected_blob.statuses.some(x => x.effect_id === 6) ? 'Can\'t escape' : '', ''];
        await this.update();
    }

    async showMoveMenu() {
        const moves = [
            this.controller.players[this.controller.current_turn].selected_blob.move_one,
            this.controller.players[this.controller.current_turn].selected_blob.move_two,
            this.controller.players[this.controller.current_turn].selected_blob.move_three,
            this.controller.players[this.controller.current_turn].selected_blob.move_four
        ];

        this.controller.menu_buttons = [];
        this.controller.menu_button_descriptions = [];

        for (let i = 0; i < moves.length; i++) {
            this.controller.menu_buttons.push(moves[i].move_name)
            this.controller.menu_button_descriptions.push('PP ' + moves[i].pp + '/' + moves[i].max_pp);
        }
        if (moves.every(x => x.pp === 0))
            this.controller.menu_buttons = ['Struggle', 'Struggle', 'Struggle', 'Struggle'];
        this.controller.menu_buttons.push('Back');
        this.controller.menu_button_descriptions.push('');
        await this.update();
        return moves;


    }
    async switchBlobMenu(player) {
        let fields_array = [];
        let valid_reactions = [];

        for (let index = 0; index < player.party.length; index++) {
            await fields_array.push({
                name: (player.party[index].health <= 0 ? this.controller.disabled_number_emojis[index] : this.controller.number_emojis[index]) + player.party[index].emoji,
                value: `\`${'█'.repeat(Math.max(0, player.party[index].health) / player.party[index].vitality * 10) + '-'.repeat(10 - Math.max(0, player.party[index].health) / player.party[index].vitality * 10)}\` ${Math.max(0, player.party[index].health)}/${player.party[index].vitality} Lv. ${player.party[index].blob_level}`,
                inline: true
            });
            if (player.party[index].health > 0) {
                await valid_reactions.push(index);
            }
        }

        await this.battle_message.edit({
            embed: {
                title: `${player.name}'s Party`,
                footer: {
                    text: "Use one of the reactions at the bottom to select your next blob."
                },
                fields: fields_array
            }
        });
        await this.battle_message.react(this.controller.number_emojis[4])
        let temp_reaction = await this.battle_message.react(this.controller.number_emojis[5]);
        return {valid_reactions, temp_reaction};
        
    }
    async log(str, doUpdate = false, time = 1000) {
        let log_lines = this.battle_log.split('\n');
        if (log_lines.length > 5) {
            this.battle_log = '';
            for (let i = 1; i < log_lines.length - 1; i++) {
                this.battle_log += log_lines[i] + '\n';
            }
            this.battle_log += log_lines[log_lines.length - 1];
        }
        this.battle_log += str + '\n';
        if (doUpdate) {
            await this.update();
            await sleep(time);
        }
        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    async update() {
        await this.battle_message.edit(await this.getBattleMessage());
    }

    async addReaction(reaction) {
        return await this.battle_message.react(reaction);
    }

    async awaitReactions(filter, options) {
        return await this.battle_message.awaitReactions(filter, options)
        .then(async collected => {
            let reaction = collected.first();                
            return reaction;
        })
        .catch(console.error);                
    }
    async getBattleMessage() {
        
        let party_field_array = ['', ''];
        for (let pi = 0; pi < this.controller.players.length; pi++) {
            for (let bi = 0; bi < 6; bi++) {
                let bullet = '•';
                if (this.controller.players[pi].party[bi].slot == this.controller.players[pi].selected_blob.slot) {
                    bullet = '__' + bullet + '__';
                }
                if (this.controller.players[pi].party[bi].health > 0) {
                    bullet = '**' + bullet + '**';
                }
                party_field_array[pi] += bullet + ' ';
            }
        }

        let fields_array = [
            {
                name: "Battle Log",
                value: `\`\`\`diff\n${this.battle_log}\`\`\``
            },
            {
                name: "⠀",
                value: "⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
                inline: true
            },
            {
                name: `Lv. ${this.controller.players[1].selected_blob.blob_level}⠀⠀⠀⠀⠀⠀⠀⠀⠀${this.controller.players[1].selected_blob.emoji}`,
                value: `\`${'█'.repeat(Math.max(0, this.controller.players[1].selected_blob.health) / this.controller.players[1].selected_blob.vitality * 15) + '-'.repeat(15 - Math.max(0, this.controller.players[1].selected_blob.health) / this.controller.players[1].selected_blob.vitality * 15)}\` ${Math.max(0, this.controller.players[1].selected_blob.health)}/${this.controller.players[1].selected_blob.vitality}`,
                inline: true
            },
            {
                name: `${this.controller.players[0].selected_blob.emoji}⠀⠀⠀⠀⠀⠀⠀⠀⠀Lv. ${this.controller.players[0].selected_blob.blob_level}`,
                value: `\`${'█'.repeat(Math.max(0, this.controller.players[0].selected_blob.health) / this.controller.players[0].selected_blob.vitality * 15) + '-'.repeat(15 - Math.max(0, this.controller.players[0].selected_blob.health) / this.controller.players[0].selected_blob.vitality * 15)}\` ${Math.max(0, this.controller.players[0].selected_blob.health)}/${this.controller.players[0].selected_blob.vitality}⠀⠀⠀⠀⠀`,
                inline: true
            },
            {
                name: "⠀",
                value: `\`\`\`${this.controller.players[this.controller.current_turn].name}'s Turn\`\`\``
            }
        ]
        for (let i = 0; i < this.controller.menu_buttons.length; i++) {
            if (i == 2)
                fields_array.push({
                    name: '⠀',
                    value: '⠀',
                    inline: true
                });
            fields_array.push({
                name: this.controller.number_emojis[i] + ' ' + this.controller.menu_buttons[i],
                value: this.controller.menu_button_descriptions[i].length > 0 ? this.controller.menu_button_descriptions[i] : '⠀',
                inline: true
            });
        }
        if (this.controller.menu_buttons.length == 4) {
            fields_array.push({
                name: '⠀',
                value: '⠀',
                inline: true
            });
        }

        return {
            embed: {
                author: {
                    name: `${this.controller.players[0].name} vs ${this.controller.players[1].name}`
                },
                description: `${party_field_array[0]} vs ${party_field_array[1]}`,
                fields: fields_array
            }
        };
    }

    

}
module.exports = BattleMessage;