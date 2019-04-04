
CREATE TABLE IF NOT EXISTS locales (
    -- locale code for messageformat
    -- http://www.unicode.org/cldr/charts/29/supplemental/language_territory_information.html
    id TEXT NOT NULL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS guilds (
    id BIGINT NOT NULL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    locale TEXT REFERENCES locales ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS users (
    id BIGINT NOT NULL PRIMARY KEY,
    "name" VARCHAR(32) NOT NULL,
    discriminator SMALLINT NOT NULL,
    bot BOOLEAN NOT NULL
);

CREATE OR REPLACE FUNCTION day_timestamp() RETURNS BIGINT AS
$$ SELECT floor(extract(epoch from now()) / 86400)::BIGINT $$
LANGUAGE SQL;

CREATE OR REPLACE FUNCTION quarter_timestamp() RETURNS BIGINT AS
$$ SELECT floor(extract(epoch from now()) / 900)::BIGINT $$
LANGUAGE SQL;

CREATE OR REPLACE FUNCTION quarter_remaining() RETURNS REAL AS
$$ SELECT (((extract(epoch from now()) * 10)::BIGINT % 9000)::REAL / 9000)::REAL $$
LANGUAGE SQL;

CREATE TYPE location_info AS (
    -- value in range [4-32), from ((x + 1) % 28) + 4
    -- rough approx to celsius, classifications are as such:
    --  y <= 8 is cold
    --  8 < y <= 14 is cool
    --  14 < y <= 24 is moderate
    --  24 < y <= 29 is warm
    --  29 < y is hot
    -- this value is never echoed to the player verbatum, only by description
    loc_temperature INT,

    -- value in range [20-100), from ((x + 2) % 80) + 20
    -- if temperature < 29 and humidity potential is >80, it is currently raining.
    -- this value is never echoed to the player verbatum, only by description
    loc_humidity_potential INT,

    -- value in range [0-39), from sqrt(1521 - ((x + 3) % 1521))
    -- rough approx to mph, classifications are as such:
    --  y <= 6 is calm
    --  6 < y <= 14 is a light breeze
    --  14 < y <= 22 is a moderate breeze
    --  22 < y <= 32 is a strong breeze
    --  32 < y is fast winds
    -- this value is never echoed to the player verbatum, only by description
    loc_wind_speed INT,

    -- true or false, whether this area has a shop or not
    -- calculated from ((x + 4) % 1414) < 565
    loc_has_shop BOOLEAN,

    -- true or false, whether this area has a pokeblob center or not
    -- calculated from ((x + 5) % 2103) < 841
    loc_has_center BOOLEAN,

    -- true or false, whether this area has a gym or not
    -- calculated from ((x + 6) % 47181) < 4718
    loc_has_gym BOOLEAN,

    -- value that determines what items appear in the store
    loc_store_potential INT,

    -- number that helps determine what name this place gets
    loc_name_index_1 INT,

    -- number that helps determine what name this place gets
    loc_name_index_2 INT,

    -- number that helps determine rarity of blobs in the current area
    loc_search_potential INT,

    -- if this location is not conventionally accessible (special event)
    loc_strange BOOLEAN
);

CREATE OR REPLACE FUNCTION parse_location(IN BIGINT) RETURNS location_info AS
$$
SELECT
    ((abs($1 + 1) % 28) + 4)::INT,
    ((abs($1 + 2) % 80) + 20)::INT,
    SQRT(1521 - (abs($1 + 3) % 1521))::INT,
    ((abs($1 + 4) % 1414) < 565)::BOOLEAN,
    ((abs($1 + 5) % 2103) < 841)::BOOLEAN,
    ((abs($1 + 6) % 47181) < 4718)::BOOLEAN,
    (abs($1 + 7) % 2147483646)::INT,
    (abs($1 + 8) % 2147482642)::INT,
    (abs($1 + 9) % 2147462557)::INT,
    (abs($1 + 10) % 14175293)::INT,
    ($1 < 0)::BOOLEAN
$$
LANGUAGE SQL;

CREATE TYPE state_info AS (
    -- whether the user is roaming or not
    state_roaming BOOLEAN,

    -- whether the user is engaged or not (in encounter, trade, gym, duel, etc)
    state_engaged BOOLEAN,

    -- whether the user is battling or not (gym/duel)
    state_battling BOOLEAN

    -- further bits exist but are yet reserved
);

CREATE OR REPLACE FUNCTION parse_state(IN BIT) RETURNS state_info AS
$$
SELECT
    get_bit($1, 0)::BOOLEAN,
    get_bit($1, 1)::BOOLEAN,
    get_bit($1, 2)::BOOLEAN
$$
LANGUAGE SQL;

CREATE OR REPLACE FUNCTION generate_location() RETURNS BIGINT AS
    $$ SELECT (RANDOM()*9223372036854775806)::BIGINT $$
LANGUAGE SQL;

CREATE OR REPLACE FUNCTION generate_center_location() RETURNS BIGINT AS
    $$ SELECT (((RANDOM()*4381649423683979)::BIGINT * 2103) + 6)::BIGINT $$
LANGUAGE SQL;

CREATE TABLE IF NOT EXISTS user_data (
    -- unique ID is a single number used to identify this member-guild id pair.
    -- it doesn't have any particular significance except for foreign keys from
    -- other tables.
    unique_id BIGSERIAL PRIMARY KEY,

    -- this ID of the user this record corresponds to
    "user" BIGINT NOT NULL REFERENCES users ON DELETE RESTRICT,

    -- the ID of the guild this record corresponds to
    guild BIGINT NOT NULL REFERENCES guilds ON DELETE RESTRICT,

    -- this causes conflicts on the same member but not on the same member
    -- in different guilds for testing reasons
    UNIQUE ("user", guild),

    -- energy the user has right now (or the last time it was relevant)
    -- bot will update this as it checks for user existence during interactions
    energy INT CONSTRAINT energy_clamp CHECK (energy >= 0) DEFAULT 50,

    -- defined as floor(extract(epoch from now()) / 86400)
    -- number defining how many days has passed since 1970-01-01 00:00 UTC
    last_used_energy BIGINT DEFAULT day_timestamp(),

    -- how much money the user has at the present time
    currency INT CONSTRAINT currency_check CHECK (currency >= 0) DEFAULT 0,

    -- how much experience the user currently has
    experience BIGINT CONSTRAINT experience_check CHECK (experience >= 0) DEFAULT 0,

    -- player ranking among players
    ranking INT CONSTRAINT ranking_check CHECK (ranking >= 0) DEFAULT 0,

    -- progress on collecting gym badges
    trainer_card_progress BIT(8) DEFAULT B'00000000',
    
    -- gym badge type (gym leader only)
    gym_badge INT DEFAULT 0, 

    -- is the player a gym leader
    gym_leader BOOLEAN DEFAULT false,

    -- user state
    -- check parse_state for definitions
    "state" BIT(16) DEFAULT B'0000000000000000',

    -- user location
    -- determines a bunch of factors, see location_info
    "location" BIGINT DEFAULT generate_center_location(),

    -- when the user last ack'd their location, when this updates, if the user is roaming, their location changes too.
    last_acked_location BIGINT DEFAULT quarter_timestamp(),

    -- when the user last experienced a roaming move, determines if roaming benefits are active or not
    last_moved_location BIGINT DEFAULT 0,

    -- total currency a user has acquired in their lifetime (non-deductable)
    accumulated_currency INT DEFAULT 0,

    -- amount of searches a user has done in their lifetime (non-deductable)
    search_count INT DEFAULT 0,

    -- milestone stuff, this covers the 'steps' of a milestone a user has already received rewards for
    unique_blob_milestone INT DEFAULT 0,
    search_count_milestone INT DEFAULT 0,
    accumulated_currency_milestone INT DEFAULT 0,
    currency_milestone INT DEFAULT 0

    
);
CREATE TABLE IF NOT EXISTS stattypes (
    
    id SERIAL PRIMARY KEY,
    
    -- id of the localestr for this stats's name
    stat_name TEXT
);

CREATE TABLE IF NOT EXISTS statusdefs (

    id SERIAL PRIMARY KEY,

    -- id of the localestr for this effect's name
    "name" TEXT,

    -- the effect message on being added
    addition_text TEXT,

    -- the status message
    status_text TEXT,

    -- the effect message
    effect_text TEXT,

    -- the effect message after removed
    removal_text TEXT,
    
    -- persists between battles
    volatile BOOLEAN,

    -- percent of health in damage taken per turn (negative if heals player)
    damage_per_turn DOUBLE PRECISION,    

    -- chance to skip turn
    skip_chance DOUBLE PRECISION,

    -- minimum turns for effect to last
    min_turns INT,

    -- maximum turns for effect to last
    max_turns INT,

    -- shortened form of word to add next to blob name
    symbol TEXT,

    -- the order this status should be used
    "priority" INT
);



CREATE TABLE IF NOT EXISTS itemmodes (
    -- what mode this item is, this determines how the code will react to it
    id SERIAL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS itemdefs (
    -- the behavior of these items should be determinable just from their records
    -- however in edge cases or for other reasons the ID can be used to specify
    -- specific unique behaviors if required. 
    id SERIAL PRIMARY KEY,

    -- id of localestr that refers to the name of this item
    "name" VARCHAR(128),

    -- value is how much this item sells in the store for.
    "value" INT,
    
    -- if the item can be used in battle
    battle_use BOOLEAN,

    -- potential is defined on a mode-specific basis
    "potential" INT,

    mode INT REFERENCES itemmodes ON DELETE RESTRICT,

    -- id of localestr that refers to this item's description
    "description" TEXT,

    -- id of localestr that refers to this item's category
    category TEXT

);

CREATE TABLE IF NOT EXISTS items (
    -- unique ID is a single number used to identify this item-member id pair.
    -- it doesn't have any particular significance except for foreign keys from
    -- other tables.
    unique_id BIGSERIAL PRIMARY KEY,

    -- ID of the item this corresponds to
    item_id INT NOT NULL REFERENCES itemdefs ON DELETE RESTRICT,

    -- ID of the user this item belongs to
    user_id BIGINT NOT NULL REFERENCES user_data ON DELETE RESTRICT,

    UNIQUE (item_id, user_id),

    -- is this item currently in effect? (for lures, etc)
    active BOOLEAN DEFAULT false,

    -- how much 'life' the item has left, (for lures, etc)
    activity_lifetime INT CONSTRAINT lifetime_clamp CHECK (activity_lifetime >= 0) DEFAULT 10,

    -- amount of the item the user possesses at the time
    amount INT CONSTRAINT amount_clamp CHECK (amount >= 0) DEFAULT 1
);

CREATE TABLE IF NOT EXISTS blobrarity (
    id SERIAL PRIMARY KEY,

    -- id of the localestr for this rarity level
    "name" TEXT,

    -- scalar for random rolls that decreases winning roll chance
    -- e.g. 20 will unfairly bias against rolling the blob at an
    -- avg of 50% lose rate compared to normal blobs
    rarity_scalar INT DEFAULT 10
);

CREATE TABLE IF NOT EXISTS blobmoves (
    -- unique ID is a single number used to identify this move.
    id BIGSERIAL PRIMARY KEY,

    -- the name of the emoji in discord
    move_name VARCHAR(32),

    -- attack damage of move
    damage INT,

    -- chance that the move will hit
    accuracy DOUBLE PRECISION,

    -- number of times the move can be used (until restored)
    max_pp INT,

    -- the primary stat that is affected
    stat_type1 INT REFERENCES stattypes ON DELETE RESTRICT,
    
    -- the effect on the stat
    stat_boost1 INT, 

    -- the secondary stat that is affected
    stat_type2 INT REFERENCES stattypes ON DELETE RESTRICT,
    
    -- the effect on the stat
    stat_boost2 INT, 

    -- the enemy's primary stat that is affected
    enemy_stat_type1 INT REFERENCES stattypes ON DELETE RESTRICT,
    
    -- the effect on the enemy's stat
    enemy_stat_debuff1 INT, 

    -- the enemy's secondary stat that is affected
    enemy_stat_type2 INT REFERENCES stattypes ON DELETE RESTRICT,
    
    -- the effect on the enemy's stat
    enemy_stat_debuff2 INT, 
    
    -- recoil percentage from move
    recoil DOUBLE PRECISION,

    -- inflicted status effect
    status_effect INT REFERENCES statusdefs ON DELETE RESTRICT,

    -- chance to inflict status
    status_chance DOUBLE PRECISION,

    -- whether the status is applied to the blob that uses the move
    self_status BOOLEAN,

    -- any additional effect the move might have
    additional_effect VARCHAR(32),

    -- description of move
    "description" TEXT,

    -- only specific blobs can have this move
    original_move BOOLEAN
);

CREATE TABLE IF NOT EXISTS blobdefs (
    -- unique ID is a single number used to identify this blob.
    -- this way if the emoji ID changes we won't break everything
    id BIGSERIAL PRIMARY KEY,

    -- the ID of the emoji in discord
    emoji_id BIGINT,

    -- the name of the emoji in discord
    emoji_name VARCHAR(32),

    -- the move ID of its default move
    default_move_id BIGINT DEFAULT 0, 

    -- rarity of this blob
    rarity INT NOT NULL REFERENCES blobrarity ON DELETE RESTRICT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS blobs (

    unique_id BIGSERIAL PRIMARY KEY,

    -- name potential for this blob, used to distinguish from other blobs of this type
    name_potential INT NOT NULL DEFAULT (RANDOM()*2147482532)::INT,

    blob_id BIGINT NOT NULL REFERENCES blobdefs ON DELETE RESTRICT,

    -- if user_id is NULL, this blob is currently roaming.
    user_id BIGINT REFERENCES user_data ON DELETE RESTRICT,

    -- max HP of this blob (HP when undamaged)
    vitality INT CONSTRAINT vitality_check CHECK (vitality >= 1) DEFAULT 40,

    -- how much health this blob has. if this is 0, the blob has fainted.
    health INT CONSTRAINT health_check CHECK (health >= 0 AND vitality >= health) DEFAULT 40,

    -- health individual values: randomizes stats per blob
    health_iv INT DEFAULT 0,

    -- attack power of this blob
    attack INT CONSTRAINT attack_check CHECK (attack >= 0) DEFAULT 5,

    -- attack individual values: randomizes stats per blob
    attack_iv INT DEFAULT 0,
    
    -- defense power of this blob
    defense INT CONSTRAINT defense_check CHECK (defense >= 0) DEFAULT 4,

    -- defense individual values: randomizes stats per blob
    defense_iv INT DEFAULT 0,

    -- 'speed' of this blob, helps determine who goes first
    speed INT CONSTRAINT speed_check CHECK (speed >= 0) DEFAULT 5,

    -- speed individual values: randomizes stats per blob
    speed_iv INT DEFAULT 0,

    -- id of the blob's first move
    move_one INT,
    
    -- current uses left of move
    move_one_pp INT,

    -- id of the blob's second move
    move_two INT,

    -- current uses left of move
    move_two_pp INT,

    -- id of the blob's third move
    move_three INT,
    
    -- current uses left of move
    move_three_pp INT,

    -- id of the blob's fourth move
    move_four INT,

    -- current uses left of move
    move_four_pp INT,

    slot INT, 
    -- time this was added to the party. parties are sorted ascending on this value,
    -- with the most recently added party member being last.
    party_addition_time TIMESTAMP,

    experience BIGINT CONSTRAINT no_negative_experience CHECK (experience >= 0) DEFAULT 0,

    blob_level INT CONSTRAINT level_check CHECK (blob_level > 0 AND blob_level <= 100) DEFAULT 1
);

CREATE TABLE IF NOT EXISTS statuses (

    unique_id BIGSERIAL PRIMARY KEY,

    status_id INT NOT NULL REFERENCES statusdefs ON DELETE RESTRICT,

    blob_id BIGINT NOT NULL REFERENCES blobs ON DELETE RESTRICT,

    UNIQUE(status_id, blob_id),

    current_turn INT CONSTRAINT turn_check CHECK (current_turn >= 0) DEFAULT 0,

    active BOOLEAN 
);

CREATE TABLE IF NOT EXISTS effecttypes (
    id SERIAL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS effectdefs (

    id SERIAL PRIMARY KEY,

    -- id of the localestr for this effect's name
    "name" TEXT,

    -- this effect's 'potential', if applicable.
    "potential" INT,

    "type" INT NOT NULL REFERENCES effecttypes
);

CREATE TABLE IF NOT EXISTS effects (

    unique_id BIGSERIAL PRIMARY KEY,

    effect_id INT NOT NULL REFERENCES effectdefs ON DELETE RESTRICT,

    user_id BIGINT NOT NULL REFERENCES user_data ON DELETE RESTRICT,

    UNIQUE(effect_id, user_id),

    -- how much 'life' this effect has left before it expires
    life INT CONSTRAINT life_clamp CHECK (life >= 0) DEFAULT 0
);

