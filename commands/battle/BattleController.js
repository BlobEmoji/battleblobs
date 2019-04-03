const BattleMessage = require('./BattleMessage.js');
const BotPlayer = require('./BotPlayer.js');
const UserPlayer = require('./UserPlayer.js');
class BattleController {

  constructor(context, connection, guild_members, player_datas, battle_message) {
    this.context = context;
    this.connection = connection;
    this.guild_members = guild_members;
    this.player_datas = player_datas;
    this.battle_message = new BattleMessage(battle_message, this);
    this.number_emojis = ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '6⃣'];
    this.disabled_number_emojis = [
      context.client.config.emojis.gray_one,
      context.client.config.emojis.gray_two,
      context.client.config.emojis.gray_three,
      context.client.config.emojis.gray_four,
      context.client.config.emojis.gray_five,
      context.client.config.emojis.gray_six
    ];
    this.current_turn = 0;
    this.battle_log = '';
    this.menu_buttons = [];
    this.menu_button_descriptions = [];
    this.game_over = false;
    this.ActionType = { MOVE: 1, ITEM: 2, SWITCH: 3, RUN: 4 };
    this.action_queue = [];
    this.players = [];
  }

  async setup() {
    this.stat_types = await this.connection.getStatTypes();
    this.status_types = await this.connection.getStatusTypes();
    this.players.push(new UserPlayer(this, this.guild_members[0], this.player_datas[0]));
    await this.players[0].getParty();
    if (this.guild_members.length === 1) {
      this.players.push(new BotPlayer(this));
    }
    else {
      this.players.push(new UserPlayer(this, this.guild_members[1], this.player_datas[1]));
    }
    await this.players[0].setOpponent(this.players[1]);
    await this.players[1].setOpponent(this.players[0]);
    await this.players[1].getParty(this.players[0]);
    await this.battle_message.setup();
    await this.play();
  }

  async play() {
    if (!this.game_over) {
      await this.queueAction(await this.players[this.current_turn].playTurn());
      await this.play();
    }
  }

  async processActions() {
    this.menu_buttons = ['', '', '', '', ''];
    this.menu_button_descriptions = ['', '', '', '', ''];
    let player_first;
    switch (this.action_queue[0].type) {
      case this.ActionType.MOVE:
        switch (this.action_queue[1].type) {
          case this.ActionType.MOVE:
            if (this.players[0].selected_blob.cur_stats[2] >= this.players[1].selected_blob.cur_stats[2])
              player_first = 0;
            else
              player_first = 1;
            break;
          default:
            player_first = 1;
        }
        break;
      case this.ActionType.ITEM:
      case this.ActionType.SWITCH:
        player_first = 0;
        break;
      case this.ActionType.RUN:
        if (this.action_queue[1].type === this.ActionType.RUN) {
          await this.endGame(null);
          return;
        }
        player_first = 0;
    }
    for (let i = 0; i < this.action_queue.length; i++) {
      this.current_turn = Math.abs(player_first - i);
      await this.action_queue[this.current_turn].play(this.current_turn);
    }

    this.current_turn = 1;
    this.action_queue = [];
  }

  async queueAction(turn) {
    await this.action_queue.push(turn);
    if (this.action_queue.length === 2) {
      await this.processActions();
    }
    this.current_turn = Math.abs(this.current_turn - 1);
  }

  async interuptActions() {
    this.action_queue = [];
  }
  async endGame(player, fair = true) {
    this.game_over = true;
    this.action_queue = [];
    if (fair) {
      this.players.forEach(async element => {
        await element.destroy();
      });
    }
    else {
      player.destroy(true);
      player.opponent.destroy(false);
    }
    if (player === null) {
      // Draw
      await this.battle_message.log('The battle has ended in a tie.', true);
    }
    else {
      await this.battle_message.log(`${player.name} has lost to ${player.opponent.name}.`, true);
      await this.calculateReward(player.opponent);
    }

  }
  async calculateReward(player) {


    if (!(await player.opponent.isPlayer())) {
      const reward_money = Math.floor(Math.random() * 50) + 5;
      const trophies = Math.floor(Math.random() * 15) + 5;
      await this.connection.modifyCoinsTracked(player.guild_member, reward_money);
      await this.connection.modifyRanking(player.guild_member, trophies);
      await this.battle_message.log(`${player.name} has earned ${reward_money} BlobCoins and ${trophies} trophies.`, true);
    }
    else if (await player.opponent.isPlayer() && await player.isPlayer()) {
      const trophies_awards = [0, 0];
      const ranking_difference = player.ranking - player.opponent.ranking;
      trophies_awards[0] = Math.max(5, Math.floor(-0.0794 * ranking_difference + 29.35838));
      trophies_awards[1] = Math.min(-5, Math.floor(-(0.0531 * (-ranking_difference) + 19.60453)));
      trophies_awards[1] = (player.opponent.ranking + trophies_awards[1]) < 0 ? -player.opponent.ranking : trophies_awards[1];
      await this.connection.modifyRanking(player.guild_member, trophies_awards[0]);
      await this.connection.modifyRanking(player.opponent.guild_member, trophies_awards[1]);
      await this.battle_message.log(`${player.name} has gained ${trophies_awards[0]} trophies.`);
      await this.battle_message.log(`${player.opponent.name} has lost ${Math.abs(trophies_awards[1])} trophies.`, true);
    }
  }

}
module.exports = BattleController;
