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
        sqlListing.push(`$${index+2}`);
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
      SELECT *,
        floor(ln((experience::FLOAT8 / 10) + 1) + 1)::INTEGER AS level                
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
    return resp.rows[0].party_size;
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

  async getStoreItems(potential, effect) {
    const resp = await this.query(`
      SELECT *,
      (exp(ln(value) * (
          CASE WHEN $2::BOOLEAN AND $1 % 3 = 0 THEN 0.7
          ELSE 0.8 END + (
            SQRT(1764 - (
              ((value) * $1::BIGINT) % 1764
            )) * 0.005
          )
        )
      ))::INTEGER AS actual_price,
      (($1 + id) % appearance_modulus) < appearance_threshold AS available
      FROM itemdefs
    `, [potential, effect]);
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

  async giveUserBlob(member, blobDef, addToParty) {
    const memberData = await this.memberData(member);
    const attackMoves = (await this.query(`SELECT id FROM blobmoves WHERE damage > 0`)).rows;    
    // ensures the blob has a damaging move
    const resp = await this.query(`
      WITH stat_info AS (
        SELECT
        (20 + (random() * 8))::INT as health,
        (5 + (random() * 2.5))::INT as atk,
        (random())::INT as atk_dev,
        (2 + (random() * 2))::INT as def,
        (random() * 0.5)::INT as def_dev,
        (3 + (random()))::INT as spc,
        (random() * 0.33)::INT as spc_dev,
        5 as spd,
        (random() * 0.25)::INT as spd_dev,
        ${attackMoves[Math.floor(Math.random() * attackMoves.length)].id}::INT as move_one,
        (1 + random() * 25)::INT as move_two,
        (1 + random() * 25)::INT as move_three,
        (1 + random() * 25)::INT as move_four,
        CASE WHEN $3::BOOLEAN THEN now() AT TIME ZONE 'UTC'
        ELSE NULL END AS add_party
      )
      INSERT INTO blobs (blob_id, user_id, vitality, health, attack, attack_dev,
        defense, defense_dev, special, special_dev, speed, speed_dev, move_one, move_two, move_three, move_four, party_addition_time)
      SELECT $2::BIGINT, $1::BIGINT, health, health, atk, atk_dev,
      def, def_dev, spc, spc_dev, spd, spd_dev, move_one, move_two, move_three, move_four, add_party
      FROM stat_info
      RETURNING *
    `, [memberData.unique_id, blobDef.id, addToParty]);
    return resp.rows[0];
  }
  async searchBlob(blobName) {    
    const resp = await this.query(`
      SELECT * FROM blobdefs WHERE emoji_name = $1      
    `, [blobName]);
    if (resp.rows[0] == undefined){
      return false;
    }    
    return resp.rows[0];
  }

  async giveBlobParty(member, blobDef) {
    const party = await this.getParty(member);
    const addToParty = party.length < 4;
    const blob = await this.giveUserBlob(member, blobDef, addToParty);
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
  
  async addRanking(member, amount)  {
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
      ORDER BY party_addition_time ASC,
      (CASE WHEN traded_time IS NOT NULL THEN traded_time
      ELSE capture_time END) DESC
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
}

module.exports = ConnectionInterface;
