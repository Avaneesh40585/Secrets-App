import { pool } from "./index.js";

export const TYPES = ["like", "love", "wow", "haha", "sad"];

export async function toggle(userId, postId, type = "like") {
  if (!TYPES.includes(type)) type = "like";

  const existing = await pool.query(
    "SELECT * FROM reactions WHERE user_id=$1 AND post_id=$2",
    [userId, postId]
  );

  if (existing.rows[0]) {
    if (existing.rows[0].type === type) {
      await pool.query("DELETE FROM reactions WHERE id=$1", [existing.rows[0].id]);
      return { active: false, type: null };
    }
    await pool.query("UPDATE reactions SET type=$1 WHERE id=$2", [type, existing.rows[0].id]);
    return { active: true, type };
  }

  await pool.query(
    "INSERT INTO reactions (user_id, post_id, type) VALUES ($1,$2,$3)",
    [userId, postId, type]
  );
  return { active: true, type, isNew: true };
}

export async function countForPost(postId) {
  const r = await pool.query(
    "SELECT COUNT(*)::int AS n FROM reactions WHERE post_id=$1",
    [postId]
  );
  return r.rows[0].n;
}

export async function userReacted(userId, postId) {
  const r = await pool.query(
    "SELECT type FROM reactions WHERE user_id=$1 AND post_id=$2",
    [userId, postId]
  );
  return r.rows[0]?.type || null;
}

export async function bulkUserReactions(userId, postIds) {
  if (!postIds.length) return {};
  const r = await pool.query(
    "SELECT post_id, type FROM reactions WHERE user_id=$1 AND post_id = ANY($2::int[])",
    [userId, postIds]
  );
  const map = {};
  for (const row of r.rows) map[row.post_id] = row.type;
  return map;
}
