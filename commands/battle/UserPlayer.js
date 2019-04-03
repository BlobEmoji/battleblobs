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
    if (this.party.length === 6) {
      return this.party;
    }
    const user_party = await this.controller.connection.getParty(this.guild_member);
    for (let i = 0; i < user_party.length; i++) {
      await this.addBattleStats(user_party[i]);
    }
    this.total_worth = user_party.reduce(function(total, blob) { return total + blob.worth; }, 0);
    this.party = user_party;
    this.selected_blob = user_party.find(x => x.health > 0);
    return user_party;
  }



  async checkBlobFainted() {
    this.party.forEach(x => x.health = x.health < 0 ? 0 : x.health);
    if (this.selected_blob.health <= 0) {
      await this.controller.battle_message.log(`${this.name}'s ${this.selected_blob.emoji_name} has fainted.`, true, 2000);
      if (!(await this.checkPartyFainted()))
        await this.blobMenu(await this.controller.battle_message.switchBlobMenu(this));
      return true;
    }
  }
  async giveExperience(amount) {
    this.selected_blob.experience = await this.controller.connection.giveBlobExperience(this.selected_blob, amount);
    const remaining_exp = Math.max(0, Math.pow(this.selected_blob.blob_level + 1, 3) - this.selected_blob.experience);
        
    await this.controller.battle_message.log(`${this.selected_blob.emoji_name} has gained ${amount} exp. (${remaining_exp} more exp to level up)`, true, 1500);
        
    if (remaining_exp === 0)
      await this.levelUp();
  }
  async levelUp() {
    const new_level = Math.floor(Math.cbrt(this.selected_blob.experience));
    const num_levels = new_level - this.selected_blob.blob_level;
        
    const new_blob = await this.copyBattleStats(
      this.selected_blob,
      await this.controller.connection.getBlob((await this.controller.connection.setBlobLevel(this.selected_blob, new_level)).unique_id)
    );

    this.party[this.selected_blob.slot] = new_blob;
    this.selected_blob = new_blob;

    for (let i = num_levels - 1; i >= 0; i--) {
      await this.controller.battle_message.log(`${this.selected_blob.emoji_name} is now level ${this.selected_blob.blob_level - i}!`, true, 2000);
    }

  }
  async playTurn(turn = null) {
    if (turn === null) {
      return await this.moveMenu(await this.controller.battle_message.showMoveMenu());
    }
    return turn;
  }
  async moveMenu(moves) {
    const temp_reaction = await this.controller.battle_message.addReaction(this.controller.number_emojis[4]);

    const filter = (reaction, user) => user.id === this.guild_member.user.id;

    const reaction = await this.controller.battle_message.awaitReactions(filter, { max: 1, time: 120000 });
    if (!reaction) {
      await this.controller.battle_message.log('The battle has timed out.', true);
      await this.controller.endGame(this.controller.players[this.controller.current_turn]);
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
      case this.controller.number_emojis[1]:
        return new Turn(this, this.controller.ActionType.MOVE, moves[1], this.controller);
      case this.controller.number_emojis[2]:
        return new Turn(this, this.controller.ActionType.MOVE, moves[2], this.controller);
      case this.controller.number_emojis[3]:
        return new Turn(this, this.controller.ActionType.MOVE, moves[3], this.controller);
      case this.controller.number_emojis[4]:
        await temp_reaction.users.remove(this.controller.context.client.user);
        await this.controller.battle_message.showOptionMenu();
        return await this.optionMenu();
    }
  }
  async optionMenu() {
    const filter = (reaction, user) => user.id === this.guild_member.user.id;
    const reaction = await this.controller.battle_message.awaitReactions(filter, { max: 1, time: 120000 });
    if (!reaction) {
      await this.controller.battle_message.log('The battle has timed out.', true);
      await this.controller.endGame(this.controller.current_turn, false);
      return null;
    }
    await reaction.users.remove(this.guild_member.user);
    switch (reaction.emoji.name) {
      case this.controller.number_emojis[0]:
        return await this.moveMenu(await this.controller.battle_message.showMoveMenu());
      case this.controller.number_emojis[1]:
        // TODO: make a bag menu
        return await this.optionMenu();
      case this.controller.number_emojis[2]:
        if (this.selected_blob.statuses.some(x => x.effect_id === 6)) {
          await this.controller.battle_message.showOptionMenu();
          return await this.optionMenu();
        }
        return new Turn(this, this.controller.ActionType.SWITCH, null, this.controller);
      case this.controller.number_emojis[3]:
        return new Turn(this, this.controller.ActionType.RUN, null, this.controller);

    }
  }
  async blobMenu(reactions) {
    const valid_reactions = reactions.valid_reactions;
    const temp_reaction = reactions.temp_reaction;

    const filter = (reaction, user) => user.id === this.guild_member.user.id;
    const reaction = await this.controller.battle_message.awaitReactions(filter, { max: 1, time: 120000 });

    if (!reaction) {
      this.selected_blob = this.party[valid_reactions[0]];
      return;
    }
    const selected_reaction = valid_reactions.find(y => reaction.emoji.name === this.controller.number_emojis[y]);
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
