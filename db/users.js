import { pool } from "./index.js";
import crypto from "crypto";

export async function findByEmail(email) {
  const r = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
  return r.rows[0] || null;
}

export async function findById(id) {
  const r = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
  return r.rows[0] || null;
}

export async function createUser({ email, password, provider = "local" }) {
  const seed = crypto.createHash("md5").update(`${email}${Date.now()}`).digest("hex");
  const r = await pool.query(
    `INSERT INTO users (email, password, provider, avatar_seed)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [email, password, provider, seed]
  );
  return r.rows[0];
}

export async function updateProfile(userId, { display_name, bio }) {
  const r = await pool.query(
    `UPDATE users SET display_name=$1, bio=$2 WHERE id=$3 RETURNING *`,
    [display_name || null, bio || null, userId]
  );
  return r.rows[0];
}

export async function updateLastSeen(userId) {
  await pool.query("UPDATE users SET last_seen_at=NOW() WHERE id=$1", [userId]);
}

export async function getStats(userId) {
  const r = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM posts WHERE user_id=$1) AS post_count,
      (SELECT COUNT(*) FROM friendships
        WHERE status='accepted' AND (requester_id=$1 OR addressee_id=$1)) AS friend_count,
      (SELECT COUNT(*) FROM reactions r
        JOIN posts p ON r.post_id = p.id WHERE p.user_id=$1) AS reactions_received
  `, [userId]);
  return r.rows[0] || { post_count: 0, friend_count: 0, reactions_received: 0 };
}

export async function searchUsers(query, excludeUserId) {
  const q = `%${query}%`;
  const r = await pool.query(
    `SELECT id, email, display_name, avatar_seed
     FROM users
     WHERE id != $2
       AND (display_name ILIKE $1 OR email ILIKE $1)
     LIMIT 20`,
    [q, excludeUserId]
  );
  return r.rows;
}
