function text(value,max){ return String(value??'').trim().slice(0,max); }
function asTime(value){ const n=Number(value); return Number.isFinite(n)&&n>0?Math.floor(n):Date.now(); }

class PlayerRepository {
  constructor(db){
    if(!db) throw new Error('PlayerRepository requires db');
    this.db=db;
    this.upsertStmt=db.prepare(`
      INSERT INTO users(user_id,unique_id,nickname,remote_avatar_url,created_at,updated_at,last_seen_at)
      VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET
        unique_id=CASE WHEN excluded.unique_id<>'' THEN excluded.unique_id ELSE users.unique_id END,
        nickname=CASE WHEN excluded.nickname<>'' THEN excluded.nickname ELSE users.nickname END,
        remote_avatar_url=CASE WHEN excluded.remote_avatar_url<>'' THEN excluded.remote_avatar_url ELSE users.remote_avatar_url END,
        updated_at=excluded.updated_at,
        last_seen_at=MAX(users.last_seen_at,excluded.last_seen_at)
    `);
    this.getStmt=db.prepare(`
      SELECT user_id,unique_id,nickname,remote_avatar_url,created_at,updated_at,last_seen_at
      FROM users WHERE user_id=?
    `);
    this.snapshotStmt=db.prepare(`
      SELECT u.user_id,u.unique_id,u.nickname,u.remote_avatar_url,u.created_at,u.updated_at,u.last_seen_at,
             a.relative_path AS avatar_relative_path
      FROM users u LEFT JOIN avatar_cache a ON a.user_id=u.user_id
      WHERE u.user_id=?
    `);
  }
  upsertProfile(profile={}){
    const userId=text(profile.userId,128);
    if(!userId) throw new Error('userId is required');
    const seenAt=asTime(profile.seenAt);
    this.upsertStmt.run(
      userId,
      text(profile.uniqueId,60),
      text(profile.nickname,60),
      text(profile.profilePictureUrl,1000),
      seenAt,seenAt,seenAt
    );
    return this.getProfile(userId);
  }

  getProfile(userId){
    const row=this.getStmt.get(text(userId,128));
    return row?this._map(row):null;
  }

  getPersistentSnapshot(userId){
    const row=this.snapshotStmt.get(text(userId,128));
    if(!row)return null;
    return {...this._map(row),avatarRelativePath:row.avatar_relative_path||null};
  }

  _map(row){
    return {
      userId:row.user_id,uniqueId:row.unique_id,nickname:row.nickname,
      profilePictureUrl:row.remote_avatar_url,createdAt:Number(row.created_at),
      updatedAt:Number(row.updated_at),lastSeenAt:Number(row.last_seen_at)
    };
  }
}

module.exports=PlayerRepository;
