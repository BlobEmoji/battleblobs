const Turn = require('./Turn.js');
const Player = require('./Player.js');
class BotPlayer extends Player {
    constructor(...args) {
        super(...args)
        this.name = 'Trainer';
    }

    async getParty(user = null) {
        if (this.party.length == 6) {
            return this.party;
        }
        let bot_party = [];
        const level_stats = await user.getLevelStats();
        for (let i = 0; i < 6; i++) {
            switch (Math.floor(Math.random() * 6)) {
                case 0:
                    bot_party.push(await this.blobBuilder(level_stats.highest_level));
                    break;
                case 1:
                case 2:
                    bot_party.push(await this.blobBuilder(level_stats.average_level));
                    break;
                case 3:
                case 4:
                    bot_party.push(await this.blobBuilder(level_stats.trimmed_average_level));
                    break;
                case 5:
                    bot_party.push(await this.blobBuilder(level_stats.lowest_level));
                    break;

            }
            bot_party[i].slot = i;
            await this.addBattleStats(bot_party[i]);
        }
        this.total_worth = bot_party.reduce(function (total, blob) { return total + blob.worth; }, 0);
        this.party = bot_party;
        this.selected_blob = bot_party.find(x => x.health > 0);        
        return bot_party;
    }

    async checkFaintStatus(player) {
        this.controller.players.forEach(p => p.party.forEach(x => x.health = x.health < 0 ? 0 : x.health));
        let ret_val = false;
        if (player.opponent.selected_blob.health <= 0) {
            await this.controller.interuptActions();
        }

        // bot blob faints
        let temp = this.controller.players[1].selected_blob;
        let gained_exp = Math.ceil(((Math.random() * 50) + 50) * temp.blob_level / 5 * Math.pow(2 * temp.blob_level + 10, 2.5) / Math.pow(temp.blob_level + this.controller.players[0].selected_blob.blob_level + 10, 2.5) + 1);
        let total_exp = parseInt((await this.controller.connection.giveBlobExperience(this.controller.players[0].selected_blob, gained_exp)).experience);
        if (Math.floor(Math.cbrt(total_exp)) > this.controller.players[0].selected_blob.blob_level) {
            let new_blob = await this.player.copyBattleStats(this.controller.players[0].selected_blob, await this.controller.connection.getBlob((await this.controller.connection.setBlobLevel(this.controller.players[0].selected_blob, Math.floor(Math.cbrt(total_exp)))).unique_id));
            this.controller.players[0].party[this.controller.players[0].selected_blob.slot] = new_blob;
            this.controller.players[0].selected_blob = new_blob;
            await this.controller.battle_message.log(`${this.controller.players[0].selected_blob.emoji_name} has gained ${gained_exp} exp. (0 more exp to level up)`)
            await this.controller.battle_message.log(`${this.controller.players[0].selected_blob.emoji_name} is now level ${this.controller.players[0].selected_blob.blob_level}!`, true);
        }
        else {
            await this.controller.battle_message.log(`${this.controller.players[0].selected_blob.emoji_name} has gained ${gained_exp} exp. (${Math.pow(this.controller.players[0].selected_blob.blob_level + 1, 3) - total_exp} more exp to level up)`, true, 1500)
        }
        if (this.controller.players[1].party.every(x => x.health === 0)) {
            await this.controller.endGame(1);
            return true;
        }
        this.controller.players[1].selected_blob = this.controller.players[1].party.find(x => x.health > 0);
        await this.controller.battle_message.log(`${this.controller.players[1].name} sent out ${this.controller.players[1].selected_blob.emoji_name}!`, true);
        ret_val = true;
    }

    async playTurn() {
        const moves = [
            this.selected_blob.move_one,
            this.selected_blob.move_two,
            this.selected_blob.move_three,
            this.selected_blob.move_four
        ];
        return new Turn(this, this.controller.ActionType.MOVE, moves[Math.floor(Math.random() * 4)], this.controller);
    }

    async blobBuilder(level) {
        let random_level = Math.ceil(Math.random() * Math.sqrt(level) - Math.sqrt(level)) + level;
        let hp_stat = Math.floor((2 * 30 + (Math.random() * 32)) * random_level / 100 + random_level + 10);
        let random_blob = await this.controller.connection.generateRandomBlobDef();
        let moves = await this.controller.connection.generateMoveSet(random_blob);
        let ret_val = {
            vitality: hp_stat,
            health: hp_stat,
            attack: Math.floor((2 * 30 + (Math.random() * 32)) * random_level / 100 + 5),
            defense: Math.floor((2 * 30 + (Math.random() * 32)) * random_level / 100 + 5),
            speed: Math.floor((2 * 30 + (Math.random() * 32)) * random_level / 100 + 5),
            move_one: moves[0].id,
            move_one_pp: moves[0].max_pp,
            move_two: moves[1].id,
            move_two_pp: moves[1].max_pp,
            move_three: moves[2].id,
            move_three_pp: moves[2].max_pp,
            move_four: moves[3].id,
            move_four_pp: moves[3].max_pp,
            blob_level: random_level,
            emoji_id: random_blob.emoji_id,
            emoji_name: random_blob.emoji_name
        };

        return ret_val;
    }
    async destroy(update = true) {
        // No action needed
    }
    async isPlayer() {
        return false;
    }   
     
}
module.exports = BotPlayer;