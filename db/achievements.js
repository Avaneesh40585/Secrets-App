import { pool } from "./index.js";

export async function listForUser(userId) {
  const r = await pool.query(
    `SELECT a.*, ua.earned_at
     FROM user_achievements ua
     JOIN achievements a ON a.key = ua.achievement_key
     WHERE ua.user_id = $1
     ORDER BY ua.earned_at DESC`,
    [userId]
  );
  return r.rows;
}

export async function award(userId, achievementKey) {
  const r = await pool.query(
    `INSERT INTO user_achievements (user_id, achievement_key)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING RETURNING *`,
    [userId, achievementKey]
  );
  if (r.rows[0]) {
    const meta = await pool.query("SELECT * FROM achievements WHERE key=$1", [achievementKey]);
    return meta.rows[0];
  }
  return null;
}

export async function check(userId) {
  const newly = [];
  const stats = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM posts WHERE user_id=$1) AS post_count,
      (SELECT COUNT(*)::int FROM reactions r
        JOIN posts p ON r.post_id=p.id WHERE p.user_id=$1) AS reactions_received,
      (SELECT COUNT(*)::int FROM reactions WHERE user_id=$1) AS reactions_given,
      (SELECT COUNT(*)::int FROM friendships
        WHERE status='accepted' AND $1 IN (requester_id, addressee_id)) AS friend_count,
      (SELECT COUNT(*)::int FROM groups WHERE creator_id=$1) AS groups_created,
      (SELECT COUNT(*)::int FROM posts WHERE user_id=$1 AND is_whisper=true) AS whispers_posted,
      (SELECT COUNT(*)::int FROM posts WHERE user_id=$1
        AND EXTRACT(HOUR FROM created_at) < 4) AS night_posts
  `, [userId]);
  const s = stats.rows[0];

  const rules = [
    ["first_post", s.post_count >= 1],
    ["ten_posts", s.post_count >= 10],
    ["first_reaction", s.reactions_given >= 1],
    ["ten_reactions", s.reactions_received >= 10],
    ["first_friend", s.friend_count >= 1],
    ["five_friends", s.friend_count >= 5],
    ["first_group", s.groups_created >= 1],
    ["night_owl", s.night_posts >= 1],
    ["whisper_master", s.whispers_posted >= 5],
  ];

  for (const [key, met] of rules) {
    if (met) {
      const awarded = await award(userId, key);
      if (awarded) newly.push(awarded);
    }
  }
  return newly;
}
