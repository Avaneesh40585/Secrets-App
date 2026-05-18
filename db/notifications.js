import { pool } from "./index.js";

export async function create({ user_id, type, reference_id = null, message }) {
  // Avoid self-notifications and duplicates within last hour for same target
  if (!user_id) return null;
  const r = await pool.query(
    `INSERT INTO notifications (user_id, type, reference_id, message)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [user_id, type, reference_id, message]
  );
  return r.rows[0];
}

export async function listForUser(userId, limit = 50) {
  const r = await pool.query(
    `SELECT * FROM notifications WHERE user_id=$1
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return r.rows;
}

export async function unreadCount(userId) {
  const r = await pool.query(
    "SELECT COUNT(*)::int AS n FROM notifications WHERE user_id=$1 AND is_read=false",
    [userId]
  );
  return r.rows[0].n;
}

export async function markRead(notificationId, userId) {
  const r = await pool.query(
    `UPDATE notifications SET is_read=true
     WHERE id=$1 AND user_id=$2 RETURNING *`,
    [notificationId, userId]
  );
  return r.rows[0] || null;
}

export async function markAllRead(userId) {
  await pool.query(
    "UPDATE notifications SET is_read=true WHERE user_id=$1 AND is_read=false",
    [userId]
  );
}
