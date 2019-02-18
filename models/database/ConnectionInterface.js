const ConnectionInterfaceBase = require('./ConnectionInterfaceBase.js');


class ConnectionInterface extends ConnectionInterfaceBase {
  async memberData(member) {
    const resp = await this.query(`
      WITH guild_table AS (
        INSERT INTO guilds (id, "name", locale)
        VALUES (
          $1::BIGINT,
          $2,
          'en'
        )
        ON CONFLICT (id)
        DO UPDATE SET
          "name" = $2
        RETURNING guilds.id as guild_id, guilds.locale
      ), user_table AS (
        INSERT INTO users (id, "name", discriminator, bot)
        VALUES (
          $3::BIGINT,
          $4,
          $5::SMALLINT,
          $6::BOOLEAN
        )
        ON CONFLICT (id)
        DO UPDATE SET
          "name" = $4,
          discriminator = $5::SMALLINT,
          bot = $6::BOOLEAN
        RETURNING users.id
      ), final_query AS (
        INSERT INTO user_data ("user", guild)
          SELECT user_table.id, guild_table.guild_id FROM user_table, guild_table
        ON CONFLICT ("user", guild)
        DO UPDATE SET
          location = CASE
            WHEN user_data.energy > 0 AND get_bit(user_data."state", 0) = 1 AND user_data.last_acked_location < quarter_timestamp() THEN generate_location()
            ELSE user_data.location
          END,
          energy = CASE
            WHEN user_data.energy < 50 AND user_data.last_used_energy < day_timestamp() THEN 50
            WHEN user_data.energy > 0 AND get_bit(user_data."state", 0) = 1 AND user_data.last_acked_location < quarter_timestamp() THEN user_data.energy - 1
            ELSE user_data.energy
          END,
          last_moved_location = CASE
            WHEN user_data.energy > 0 AND get_bit(user_data."state", 0) = 1 AND user_data.last_acked_location < quarter_timestamp() THEN quarter_timestamp()
            ELSE user_data.last_moved_location
          END,
          last_used_energy = day_timestamp(),
          last_acked_location = quarter_timestamp()
        RETURNING *, xmax != 0 AS updated
      )
      SELECT *,
        quarter_remaining() AS quarter_remaining,
        last_acked_location = last_moved_location AS roaming_effect
      FROM final_query, parse_location(final_query.location), parse_state(final_query."state"), guild_table
    `, [
        member.guild.id,
        member.guild.name,
        member.user.id,
        member.user.username,
        member.user.discriminator,
        member.user.bot
      ]);

    if (resp.rows[0] && !resp.rows[0].updated)
      // user has just been created, supply 5 basic balls
      await this.giveUserItem(member, 1, 5);

    return resp.rows[0];
  }

  async updateParty(member, blobList) {
    const updateList = blobList.slice(0, 4);
    const memberData = await this.memberData(member);
    if (updateList.length === 0) {
      // no blobs, so clear their party
      await this.query(`
        UPDATE blobs
        SET party_addition_time = NULL
        WHERE user_id = $1
      `, [memberData.unique_id]);
      // return emptylist because we just cleared the list
      return [];
    } else {
      const sqlListing = [];
      const argumentListing = [];

      // create SQL prepared arg string and the respective values
      blobList.map((blobID, index) => {
        sqlListing.push(`$${index + 2}`);
        argumentListing.push(blobID);
      });

      // remove all blobs from party that aren't in this list
      await this.query(`
        UPDATE blobs
        SET party_addition_time = NULL
        WHERE user_id = $1
        AND unique_id NOT IN (${sqlListing.join(', ')})
      `, [memberData.unique_id, ...argumentListing]);

      // update blobs to add any blobs in this list that aren't in the party
      const resp = await this.query(`
        UPDATE blobs
        SET party_addition_time = CASE
          WHEN blobs.party_addition_time IS NULL THEN now()::TIMESTAMP
          ELSE blobs.party_addition_time -- don't change timestamp on blobs that already have one
        END -- we could do this using when but then existing party members aren't returned
        WHERE user_id = $1
        AND unique_id IN (${sqlListing.join(', ')})
        RETURNING *
      `, [memberData.unique_id, ...argumentListing]);

      return resp.rows;
    }
  }

  async getParty(member) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      SELECT *                
      FROM blobs INNER JOIN blobdefs
      ON blobdefs.id = blobs.blob_id
      WHERE user_id = $1
      AND party_addition_time IS NOT NULL
      ORDER BY party_addition_time ASC
    `, [memberData.unique_id]);
    return resp.rows;
  }

  async isPartyEmpty(member) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      SELECT count(*) filter(WHERE user_id = $1) as party_size
      FROM blobs           
    `, [memberData.unique_id]);
    return (resp.rows[0].party_size == 0);
  }

  async updateRoamingState(member, yesNo) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      UPDATE user_data
      SET state = set_bit(user_data.state, 0, $2::BOOLEAN::INTEGER)
      WHERE unique_id = $1
      RETURNING *
    `, [memberData.unique_id, yesNo]);
    return resp.rows[0];
  }

  // startup function if the bot dies while a user was engaged
  async clearEngaged() {
    await this.query(`
      UPDATE user_data
      SET state = set_bit(user_data.state, 1, 0)
    `);
  }

  async setEngaged(member, yesNo) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      UPDATE user_data
      SET state = set_bit(user_data.state, 1, $2::BOOLEAN::INTEGER)
      WHERE unique_id = $1
      RETURNING *
    `, [memberData.unique_id, yesNo]);
    return resp.rows[0];
  }

  async modifyEnergy(member, amount) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      UPDATE user_data
      SET energy = energy + $2
      WHERE unique_id = $1
      RETURNING *
    `, [memberData.unique_id, amount]);
    return resp.rows[0];
  }

  async modifySearchCount(member, amount) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      UPDATE user_data
      SET search_count = search_count + $2
      WHERE unique_id = $1
      RETURNING *
    `, [memberData.unique_id, amount]);
    return resp.rows[0];
  }

  async modifyCoinsTracked(member, amount) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      UPDATE user_data
      SET currency = currency + $2,
      accumulated_currency = accumulated_currency + GREATEST($2, 0)
      WHERE unique_id = $1
      RETURNING *
    `, [memberData.unique_id, amount]);
    return resp.rows[0];
  }

  async modifyCoinsUntracked(member, amount) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      UPDATE user_data
      SET currency = currency + $2
      WHERE unique_id = $1
      RETURNING *
    `, [memberData.unique_id, amount]);
    return resp.rows[0];
  }

  async getStoreItems() {
    const resp = await this.query(`
      SELECT *
      FROM itemdefs
    `, );
    return resp.rows;
  }

  async giveUserItem(member, itemID, amount) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      INSERT INTO items (item_id, user_id, amount)
      VALUES ($2::BIGINT, $1::BIGINT, $3)
      ON CONFLICT (item_id, user_id)
      DO UPDATE SET
      amount = items.amount + $3
      RETURNING *
    `, [memberData.unique_id, itemID, amount]);
    return resp.rows[0];
  }

  async takeUserItem(member, itemID, amount) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      UPDATE items
      SET amount = items.amount - $3
      WHERE item_id = $2::BIGINT AND user_id = $1::BIGINT
      RETURNING *
    `, [memberData.unique_id, itemID, amount]);
    if (!resp.rows[0])
      throw { code: -1, error: 'no item entry' };
    return resp.rows[0];
  }

  async getUserItems(member) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      SELECT * FROM items
      INNER JOIN itemdefs
      ON items.item_id = itemdefs.id
      WHERE user_id = $1::BIGINT
      ORDER BY potential DESC
    `, [memberData.unique_id]);
    return resp.rows;
  }
  async getUserItemCount(member, item_id) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      SELECT count(*) filter(WHERE user_id = $1::BIGINT AND item_id = $2::INT) as item_count
      FROM items
    `, [memberData.unique_id, item_id]);
    return resp.rows[0].item_count;
  }
  async giveBlobExperience(blob, exp) {
    const resp = await this.query(`
    UPDATE blobs
    SET experience = blobs.experience + $2
    WHERE unique_id = $1
    RETURNING *
    `, [blob.unique_id, exp]);
    return resp.rows[0];
  }
  async setBlobLevel(blob, level) {
    const resp = await this.query(`
    UPDATE blobs 
    SET blob_level = $2::INT,
    health = FLOOR($7::DECIMAL / $8::DECIMAL * (FLOOR((2 * (30 + $3::INT)) * $2 / 100) + $2 + 10)),
    vitality = FLOOR((2 * (30 + $3::INT)) * $2 / 100) + $2 + 10,
    attack = FLOOR((2 * (30 + $4::INT)) * $2 / 100) + 5,
    defense = FLOOR((2 * (30 + $5::INT)) * $2 / 100) + 5,
    speed = FLOOR((2 * (30 + $6::INT)) * $2 / 100) + 5
    WHERE unique_id = $1
    RETURNING *
    `, [blob.unique_id, level, blob.health_iv, blob.attack_iv, blob.defense_iv, blob.speed_iv, blob.health, blob.vitality]);
    return resp.rows[0];
  }
  async getMove(move_id) {
    const resp = await this.query(`
    SELECT * FROM blobmoves WHERE id = $1`, [move_id]);
    return resp.rows[0];
  }

  async randomizedIV() {
    return Math.floor(Math.random() * 32);
  }

  async generateMoveSet(blobDef) {
    let moves = [];
    let move_list = (await this.query(
      `SELECT * FROM blobmoves WHERE original_move = FALSE`)).rows;
    let attack_move_list = (await this.query(
      `SELECT * FROM blobmoves WHERE damage > 0 AND damage < 200 AND original_move = FALSE`)).rows;
    let original_move_list = (await this.query(
      `SELECT * FROM blobmoves WHERE original_move = TRUE`)).rows;
    let move;

    // default move
    if (blobDef.default_move_id == 0) {
      move = move_list.splice(Math.floor(Math.random() * move_list.length), 1)[0];
    }
    else {
      if (move_list.findIndex(x => x.id == blobDef.default_move_id) != -1) {
        move = move_list.splice(move_list.findIndex(x => x.id == blobDef.default_move_id), 1)[0];
      }
      else {
        move = original_move_list.find(x => x.id == blobDef.default_move_id);
      }
    }
    let attack_move_index = attack_move_list.findIndex(x => x.id == move.id);
    if (attack_move_index != -1) {
      attack_move_list.splice(attack_move_index, 1);
    }
    moves.push(move);

    // attack move
    move = attack_move_list.splice(Math.floor(Math.random() * attack_move_list.length), 1)[0];
    move_list.splice(move_list.findIndex(x => x.id == move.id), 1);
    moves.push(move);

    // any move
    for (let i = 0; i < 2; i++) {
      move = move_list.splice(Math.floor(Math.random() * move_list.length), 1)[0];
      moves.push(move);
    }

    return moves;
  }

  async giveUserBlob(member, blobDef, addToParty, slot) {
    const memberData = await this.memberData(member);
    const moves = await this.generateMoveSet(blobDef);
    const resp = await this.query(`
      WITH stat_info AS (
        SELECT
        FLOOR((2 * (30 + $4::INT)) * 1 / 100) + 1 + 10 as health,
        $4::INT as health_iv,
        FLOOR((2 * (30 + $5::INT)) * 1 / 100) + 5 as atk,
        $5::INT as atk_iv,
        FLOOR((2 * (30 + $6::INT)) * 1 / 100) + 5 as def,
        $6::INT as def_iv,
        FLOOR((2 * (30 + $7::INT)) * 1 / 100) + 5 as spd,
        $7::INT as spd_iv,
        $8::INT as move_one,
        $9::INT as move_one_pp,
        $10::INT as move_two,
        $11::INT as move_two_pp,
        $12::INT as move_three,
        $13::INT as move_three_pp,
        $14::INT as move_four,
        $15::INT as move_four_pp,
        $16::INT as slot,
        CASE WHEN $3::BOOLEAN THEN now() AT TIME ZONE 'UTC'
        ELSE NULL END AS add_party
      )
      INSERT INTO blobs (blob_id, user_id, vitality, health, health_iv, attack, attack_iv,
        defense, defense_iv, speed, speed_iv, move_one, move_one_pp, move_two, move_two_pp, move_three, move_three_pp, move_four, move_four_pp, slot, party_addition_time)
      SELECT $2::BIGINT, $1::BIGINT, health, health, health_iv, atk, atk_iv,
      def, def_iv, spd, spd_iv, move_one, move_one_pp, move_two, move_two_pp, move_three, move_three_pp, move_four, move_four_pp, slot, add_party
      FROM stat_info
      RETURNING *
    `, [
        memberData.unique_id,
        blobDef.id,
        addToParty,
        await this.randomizedIV(),
        await this.randomizedIV(),
        await this.randomizedIV(),
        await this.randomizedIV(),
        moves[0].id,
        moves[0].max_pp,
        moves[1].id,
        moves[1].max_pp,
        moves[2].id,
        moves[2].max_pp,
        moves[3].id,
        moves[3].max_pp,
        slot
      ]);
    return resp.rows[0];
  }

  async searchBlob(blobName) {
    const resp = await this.query(`
      SELECT * FROM blobdefs WHERE emoji_name = $1      
    `, [blobName]);
    if (resp.rows[0] == undefined) {
      return false;
    }
    return resp.rows[0];
  }

  async getBlob(unique_id) {
    const resp = await this.query(`
      SELECT *                
      FROM blobs INNER JOIN blobdefs
      ON blobdefs.id = blobs.blob_id
      WHERE unique_id = $1      
    `, [unique_id]);
    return resp.rows[0];
  }
  async updateBlob(blob) {
    let new_blob = [
      blob.unique_id,
      blob.blob_id,
      blob.vitality,
      blob.health,
      blob.health_iv,
      blob.attack,
      blob.attack_iv,
      blob.defense,
      blob.defense_iv,
      blob.speed,
      blob.speed_iv,
      blob.move_one,
      blob.move_two,
      blob.move_three,
      blob.move_four,
      blob.slot,
      blob.experience,
      blob.blob_level,
    ]
    const resp = await this.query(`
    UPDATE blobs
    SET blob_id = $2::BIGINT,
    vitality = $3::INT,
    health = $4::INT,
    health_iv = $5::INT,
    attack = $6::INT,
    attack_iv = $7::INT,
    defense = $8::INT,
    defense_iv = $9::INT,
    speed = $10::INT,
    speed_iv = $11::INT,
    move_one = $12::INT,
    move_two = $13::INT,
    move_three = $14::INT,
    move_four = $15::INT,
    slot = $16::INT,
    experience = $17::BIGINT,
    blob_level = $18::INT
    WHERE unique_id = $1
    RETURNING *
    `, new_blob);
    return resp.rows[0];
  }

  async updateBattleBlob(blob) {
    const resp = await this.query(`
    UPDATE blobs
    SET
    health = $2::INT,
    move_one_pp = $3::INT,
    move_two_pp = $4::INT,
    move_three_pp = $5::INT,
    move_four_pp = $6::INT
    WHERE unique_id = $1
    RETURNING *
    `, [blob.unique_id, blob.health, blob.move_one.pp, blob.move_two.pp, blob.move_three.pp, blob.move_four.pp]);
    return resp.rows[0];
  }
  async healAllBlobs(member) {
    const memberData = await this.memberData(member);
    const blobs = await this.getParty(member);
    for (let i = 0; i < blobs.length; i++) {
      await this.healBlob(blobs[i]);
    }
  }

  async healBlob(blob) {
    const moves = [
      await this.getMove(blob.move_one),
      await this.getMove(blob.move_two),
      await this.getMove(blob.move_three),
      await this.getMove(blob.move_four)
    ];
    const resp = await this.query(`
    UPDATE blobs
    SET
    health = $2::INT,
    move_one_pp = $3::INT,
    move_two_pp = $4::INT,
    move_three_pp = $5::INT,
    move_four_pp = $6::INT
    WHERE unique_id = $1
    RETURNING *
    `, [blob.unique_id, blob.vitality, moves[0].max_pp, moves[1].max_pp, moves[2].max_pp, moves[3].max_pp]);

  }

  async generateRandomBlobDef() {
    const resp = await this.query(`
      SELECT * FROM blobdefs
    `);
    return resp.rows[Math.floor(resp.rows.length * Math.random())];
  }

  async giveBlobParty(member, blobDef, slot) {
    const party = await this.getParty(member);
    const addToParty = party.length < 6;
    const blob = await this.giveUserBlob(member, blobDef, addToParty, slot);
    if (addToParty)
      party.push(blob);
    return { blob, addToParty, party };
  }

  async getRank(member) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      WITH rank_table AS (
        SELECT unique_id, \"user\" as user_id, ranking, ROW_NUMBER () OVER (ORDER BY
        ranking DESC,
        \"user\" DESC)
      FROM user_data
      WHERE guild = $2)
      SELECT row_number, user_id, ranking
      FROM rank_table
      WHERE unique_id = $1
    `, [memberData.unique_id, memberData.guild]);
    return resp.rows[0];
  }

  async getAdjRanks(member, row) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      WITH rank_table AS (
        SELECT \"user\" as user_id, ranking, ROW_NUMBER () OVER (ORDER BY
        ranking DESC,
        \"user\" DESC)
      FROM user_data
      WHERE guild = $1)
      SELECT row_number, user_id, ranking
      FROM rank_table
      WHERE row_number = $2 + 1 
      OR row_number = $2 -1
    `, [memberData.guild, row]);
    return resp.rows;
  }

  async getTop5Ranks(member) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      WITH rank_table AS (
        SELECT unique_id, \"user\" as user_id, ranking, ROW_NUMBER () OVER (ORDER BY
        ranking DESC,
        \"user\" DESC)
      FROM user_data
      WHERE guild = $1)
      SELECT row_number, user_id, ranking
      FROM rank_table
      WHERE row_number < 6
    `, [memberData.guild]);
    return resp.rows;
  }

  async modifyRanking(member, amount) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      UPDATE user_data
      SET ranking = user_data.ranking + $2
      WHERE unique_id = $1::BIGINT
      RETURNING *
    `, [memberData.unique_id, amount]);
    return resp.rows[0];
  }


  async changeGuildLocale(guild_id, locale) {
    const resp = await this.query(`
      UPDATE guilds
      SET locale = $2
      WHERE id = $1::BIGINT
      RETURNING *
    `, [guild_id, locale]);
    return resp.rows[0];
  }

  async getUserBlobs(member) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      SELECT *, party_addition_time IS NOT NULL AS in_party
      FROM blobs INNER JOIN blobdefs
      ON blobdefs.id = blobs.blob_id
      WHERE user_id = $1
      ORDER BY party_addition_time ASC      
    `, [memberData.unique_id]);
    return resp.rows;
  }


  async getUserEffects(member) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      SELECT *
      FROM effects INNER JOIN effectdefs
      ON effects.effect_id = effectdefs.id
      WHERE user_id = $1 AND life > 0
      ORDER BY life DESC
    `, [memberData.unique_id]);
    return resp.rows;
  }

  async giveUserEffect(member, effectID, life) {
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      INSERT INTO effects (user_id, effect_id, life)
      VALUES ($1::BIGINT, $2::BIGINT, $3)
      ON CONFLICT (effect_id, user_id)
      DO UPDATE SET
      life = effects.life + $3
      RETURNING *
    `, [memberData.unique_id, effectID, life]);
    return resp.rows[0];
  }

  async consumeUserEffects(member, effectType, strength) {
    strength = strength ? strength : 1;
    const memberData = await this.memberData(member);
    const resp = await this.query(`
      UPDATE effects SET
      life = effects.life - $3
      FROM effectdefs
      WHERE user_id = $1::BIGINT AND life >= $3
      AND effects.effect_id = effectdefs.id AND effectdefs.type = $2
      RETURNING *
    `, [memberData.unique_id, effectType, strength]);
    return resp.rows;
  }

  async getStatTypes() {
    const resp = await this.query(`SELECT stat_name FROM stattypes`);
    return resp.rows;
  }

  async getStatusTypes() {
    const resp = await this.query(`SELECT * FROM statusdefs`);
    return resp.rows;
  }
}

module.exports = ConnectionInterface;
