const Turn = require('./Turn.js');
const Player = require('./Player.js');
class UserPlayer extends Player {
    constructor(controller, guild_member, user_data) {
        super(controller);
        this.guild_member = guild_member;
        this.name = guild_member.user.username;
        this.ranking = user_data.ranking;
    }

    async getParty() {
        if (this.party.length == 6) {
            return this.party;
        }
        let user_party = await this.controller.connection.getParty(this.guild_member);
        for (let i = 0; i < user_party.length; i++) {
            await this.addBattleStats(user_party[i]);
        }
        this.total_worth = user_party.reduce(function (total, blob) { return total + blob.worth; }, 0);
        this.party = user_party;
        this.selected_blob = user_party.find(x => x.health > 0);
        return user_party;
    }

    async playTurn(turn = null) {
        if (turn == null) {
            return await this.moveMenu(await this.controller.battle_message.showMoveMenu());
        }
        return turn;
    }
    async moveMenu(moves) {
        let temp_reaction = await this.controller.battle_message.addReaction(this.controller.number_emojis[4]);

        const filter = (reaction, user) => user.id === this.guild_member.user.id;
        
        let reaction = await this.controller.battle_message.awaitReactions(filter, { max: 1, time: 120000 });
        if (!reaction) {      
            await this.controller.battle_message.log('The battle has timed out.', true);
            await this.controller.endGame(this.controller.current_turn);
            return null;
        }
        
        await reaction.users.remove(this.guild_member.user);

        if (this.controller.number_emojis.some((x, i) => reaction.emoji.name === x && i < 4 && moves[i].pp === 0)) {
            return await this.moveMenu(moves);

        }

        if (moves.every(x => x.pp === 0) && this.controller.number_emojis[4] === reaction.emoji.name) {
            // Struggle
            return new Turn(this, this.controller.ActionType.MOVE, null, this.controller);
        }

        switch (reaction.emoji.name) {
            case this.controller.number_emojis[0]:
                return new Turn(this, this.controller.ActionType.MOVE, moves[0], this.controller);
                break;
            case this.controller.number_emojis[1]:
                return new Turn(this, this.controller.ActionType.MOVE, moves[1], this.controller);
                break;
            case this.controller.number_emojis[2]:
                return new Turn(this, this.controller.ActionType.MOVE, moves[2], this.controller);
                break;
            case this.controller.number_emojis[3]:
                return new Turn(this, this.controller.ActionType.MOVE, moves[3], this.controller);
                break;
            case this.controller.number_emojis[4]:
                await temp_reaction.users.remove(this.controller.context.client.user);
                await this.controller.battle_message.showOptionMenu();
                return await this.optionMenu();
                break;
        }
    }
    async optionMenu() {
        const filter = (reaction, user) => user.id === this.guild_member.user.id;
        let reaction = await this.controller.battle_message.awaitReactions(filter, { max: 1, time: 120000 })
        if (!reaction) {
            await this.controller.battle_message.log('The battle has timed out.', true);
            await this.controller.endGame(this.controller.current_turn, false);
            return null;
        }
        await reaction.users.remove(this.guild_member.user);
        switch (reaction.emoji.name) {
            case this.controller.number_emojis[0]:
                return await this.moveMenu(await this.controller.battle_message.showMoveMenu());
                break;
            case this.controller.number_emojis[1]:
                // TODO: make a bag menu
                return await this.optionMenu();
                break;
            case this.controller.number_emojis[2]:
                if (this.selected_blob.statuses.some(x => x.effect_id === 6)) {
                    await this.controller.battle_message.showOptionMenu();
                    return await this.optionMenu();
                }
                return new Turn(this, this.controller.ActionType.SWITCH, null, this.controller);
                break;
            case this.controller.number_emojis[3]:
                return new Turn(this, this.controller.ActionType.RUN, null, this.controller);
                break;

        }
    }
    async blobMenu(reactions) {
        let valid_reactions = reactions.valid_reactions; 
        let temp_reaction = reactions.temp_reaction;
        
        const filter = (reaction, user) => user.id === this.guild_member.user.id;
        let reaction = await this.controller.battle_message.awaitReactions(filter, { max: 1, time: 120000 })
        
        if (!reaction) {
            this.selected_blob = this.party[valid_reactions[0]];
            return;
        }
        let selected_reaction = valid_reactions.find(y => reaction.emoji.name == this.controller.number_emojis[y]);
        await reaction.users.remove(this.guild_member.user);
        if (selected_reaction >= 0) {
            this.selected_blob = this.party[selected_reaction];
            await this.controller.battle_message.log(`${this.name} sent out ${this.selected_blob.emoji_name}!`, true);
            temp_reaction.users.remove(this.controller.context.client.user);
        }
        else {
            await this.blobMenu(reactions);
        }

    }

    async destroy(update = true) {
        await this.controller.connection.setEngaged(this.guild_member, false);
        if (update) {
            await this.updateParty();
        }
    }
    async updateParty() {
        this.party.forEach(async x => {
            await this.controller.connection.updateBattleBlob(x);
        });
    }
    async isPlayer() {
        return true;
    }
}
module.exports = UserPlayer;