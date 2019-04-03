class Player {
  constructor(controller) {
    this.controller = controller;
    this.party = [];
    this.total_worth = 0;
    this.selected_blob = null;
  }
    
  async getParty() {
    throw new Error('Unimplemented method: getParty');
  }
  async destroy() {
    throw new Error('Unimplemented method: destroy');
  }
  async playTurn() {
    throw new Error('Unimplemented method: playTurn');
  }
  async isPlayer() {
    throw new Error('Unimplemented method: isPlayer');
  }
  async checkBlobFainted() {
    throw new Error('Unimplemented method: checkBlobFainted');
  }
  async checkPartyFainted() {
    return !this.party.some(x => x.health > 0);
  }
  async setOpponent(player) {
    this.opponent = player;
  } 
  async copyBattleStats(oldblob, newblob) {
    newblob.cur_stats = oldblob.cur_stats;
    newblob.stages = oldblob.stages;
    newblob.statuses = oldblob.statuses;
    newblob.worth = newblob.blob_level;
    newblob.move_one = oldblob.move_one;
    newblob.move_one.pp = oldblob.move_one.pp;
    newblob.move_two = oldblob.move_two;
    newblob.move_two.pp = oldblob.move_two.pp;
    newblob.move_three = oldblob.move_three;
    newblob.move_three.pp = oldblob.move_three.pp;
    newblob.move_four = oldblob.move_four;
    newblob.move_four.pp = oldblob.move_four.pp;
    newblob.emoji = oldblob.emoji;
    return newblob;
  }
  async addBattleStats(blob) {
    blob.cur_stats = [blob.attack, blob.defense, blob.speed];
    blob.stages = [0, 0, 0];
    blob.statuses = [{ effect_id: 1, remove_turn: 0, current_turn: 0 }];
    blob.worth = blob.blob_level;
    blob.move_one = await this.controller.connection.getMove(blob.move_one);
    blob.move_one.pp = blob.move_one_pp;
    blob.move_two = await this.controller.connection.getMove(blob.move_two);
    blob.move_two.pp = blob.move_two_pp;
    blob.move_three = await this.controller.connection.getMove(blob.move_three);
    blob.move_three.pp = blob.move_three_pp;
    blob.move_four = await this.controller.connection.getMove(blob.move_four);
    blob.move_four.pp = blob.move_four_pp;
    const emoji = this.controller.context.client.emojis.find(emoji => emoji.id === blob.emoji_id);
    if (emoji) {
      blob.emoji = `${emoji}`;
    }
    else {
      // if the emoji is not found
      blob.emoji = `:${blob.emoji_name}:`;
    }
    return blob;
  }

  async getLevelStats() {
    let total = 0;
    const level_stats = {
      lowest_level: 100,
      highest_level: 0,
    };
        
    this.party.forEach(function(blob) {
      total += blob.blob_level;
      if (blob.blob_level > level_stats.highest_level)
        level_stats.highest_level = blob.blob_level;
      if (blob.blob_level < level_stats.lowest_level)
        level_stats.lowest_level = blob.blob_level;
    });

    level_stats.average_level = Math.floor(total / 6);
    level_stats.trimmed_average_level = Math.floor((total - level_stats.highest_level - level_stats.lowest_level) / 4);
    return level_stats;
  }
    
    
}
module.exports = Player;
