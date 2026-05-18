import { pool } from "./index.js";

export async function create({ post_id, user_id, content, is_anonymous = true }) {
  const r = await pool.query(
    `INSERT INTO comments (post_id, user_id, content, is_anonymous)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [post_id, user_id, content, is_anonymous]
  );
  return r.rows[0];
}

export async function listForPost(postId) {
  const r = await pool.query(
    `SELECT c.*, u.email, u.display_name, u.avatar_seed
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC`,
    [postId]
  );
  return r.rows;
}

export async function getPostOwner(postId) {
  const r = await pool.query("SELECT user_id FROM posts WHERE id=$1", [postId]);
  return r.rows[0]?.user_id || null;
}
