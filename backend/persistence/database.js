const fs=require('node:fs');
const path=require('node:path');
const {DatabaseSync}=require('node:sqlite');

const DEFAULT_DB_FILE=path.join(__dirname,'..','data','pipa-live.db');

function ensureParent(filename){
  if(filename===':memory:')return;
  fs.mkdirSync(path.dirname(filename),{recursive:true});
}

function createSchemaV1(db){
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      unique_id TEXT NOT NULL DEFAULT '',
      nickname TEXT NOT NULL DEFAULT 'Espectador',
      remote_avatar_url TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS avatar_cache (
      user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
      relative_path TEXT NOT NULL,
      remote_url TEXT NOT NULL,
      etag TEXT,
      content_hash TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS gift_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_key TEXT NOT NULL UNIQUE,
      room_id TEXT NOT NULL DEFAULT '',
      message_id TEXT NOT NULL DEFAULT '',
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      gift_id TEXT NOT NULL DEFAULT '',
      gift_name TEXT NOT NULL DEFAULT '',
      repeat_count INTEGER NOT NULL DEFAULT 1,
      unit_coin_value INTEGER NOT NULL DEFAULT 0,
      total_coin_value INTEGER NOT NULL DEFAULT 0,
      tier_key TEXT NOT NULL DEFAULT '',
      effect_json TEXT NOT NULL DEFAULT '{}',
      maneuver_name TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS progression (
      user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
      gift_points INTEGER NOT NULL DEFAULT 0,
      lifetime_coin_value INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS owned_kites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      kite_key TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      asset_path TEXT NOT NULL DEFAULT '',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      source_ledger_id INTEGER REFERENCES gift_ledger(id),
      owned_at INTEGER NOT NULL,
      UNIQUE(user_id,kite_key)
    );
`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS owned_skins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      skin_key TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      source_ledger_id INTEGER REFERENCES gift_ledger(id),
      owned_at INTEGER NOT NULL,
      UNIQUE(user_id,skin_key)
    );

    CREATE TABLE IF NOT EXISTS loadouts (
      user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
      equipped_kite_key TEXT,
      equipped_skin_key TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_kite_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      source_ledger_id INTEGER UNIQUE REFERENCES gift_ledger(id),
      status TEXT NOT NULL DEFAULT 'pending',
      requested_at INTEGER NOT NULL,
      approved_at INTEGER,
      kite_key TEXT,
      display_name TEXT NOT NULL DEFAULT '',
      asset_path TEXT NOT NULL DEFAULT ''
    );
    PRAGMA user_version=1;
  `);
}
function openPipaDatabase(filename=DEFAULT_DB_FILE){
  const target=filename || DEFAULT_DB_FILE;
  ensureParent(target);
  const db=new DatabaseSync(target);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=2500;');
  if(target!==':memory:') db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;');
  const version=Number(db.prepare('PRAGMA user_version').get().user_version)||0;
  if(version===0) createSchemaV1(db);
  else if(version>1){ db.close(); throw new Error(`Unsupported pipa-live.db schema version ${version}`); }
  return db;
}

module.exports={openPipaDatabase,DEFAULT_DB_FILE};
