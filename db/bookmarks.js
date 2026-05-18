import { pool } from "./index.js";
import { getCodename, getAvatarColors, getInitial } from "./codenames.js";

export async function toggle(userId, postId) {
  const exists = await pool.query(
    'SELECT 1 FROM bookmarks WHERE user_id=$1 AND post_id=$2',
    [userId, postId]
  );
  if (exists.rowCount > 0) {
    await pool.query('DELETE FROM bookmarks WHERE user_id=$1 AND post_id=$2', [userId, postId]);
    return false;
  }
  await pool.query('INSERT INTO bookmarks (user_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, postId]);
  return true;
}

export async function listForUser(userId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `SELECT p.*, u.email AS author_email, u.display_name AS author_display_name,
       u.avatar_seed AS author_avatar_seed,
       (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) AS reaction_count,
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
       (SELECT COUNT(*) FROM posts pr WHERE pr.parent_post_id = p.id) AS reply_count,
       true AS bookmarked
     FROM bookmarks bk
     JOIN posts p ON p.id = bk.post_id
     JOIN users u ON u.id = p.user_id
     WHERE bk.user_id = $1
     ORDER BY bk.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows;
}
