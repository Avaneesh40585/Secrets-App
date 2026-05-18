import { pool } from "./index.js";

export async function sendRequest(requesterId, addresseeId) {
  if (requesterId === addresseeId) throw new Error("Cannot friend yourself");
  const r = await pool.query(
    `INSERT INTO friendships (requester_id, addressee_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (requester_id, addressee_id) DO NOTHING
     RETURNING *`,
    [requesterId, addresseeId]
  );
  return r.rows[0] || null;
}

export async function accept(friendshipId, userId) {
  const r = await pool.query(
    `UPDATE friendships SET status='accepted'
     WHERE id=$1 AND addressee_id=$2 AND status='pending'
     RETURNING *`,
    [friendshipId, userId]
  );
  return r.rows[0] || null;
}

export async function decline(friendshipId, userId) {
  const r = await pool.query(
    `DELETE FROM friendships
     WHERE id=$1 AND (addressee_id=$2 OR requester_id=$2)
     RETURNING *`,
    [friendshipId, userId]
  );
  return r.rows[0] || null;
}

export async function listFriends(userId) {
  const r = await pool.query(
    `SELECT f.id AS friendship_id, u.id, u.email, u.display_name, u.avatar_seed
     FROM friendships f
     JOIN users u ON u.id = (CASE WHEN f.requester_id=$1 THEN f.addressee_id ELSE f.requester_id END)
     WHERE f.status='accepted' AND ($1 IN (f.requester_id, f.addressee_id))
     ORDER BY u.display_name NULLS LAST, u.email`,
    [userId]
  );
  return r.rows;
}

export async function listIncoming(userId) {
  const r = await pool.query(
    `SELECT f.id AS friendship_id, u.id, u.email, u.display_name, u.avatar_seed
     FROM friendships f
     JOIN users u ON u.id = f.requester_id
     WHERE f.addressee_id=$1 AND f.status='pending'
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return r.rows;
}

export async function listOutgoing(userId) {
  const r = await pool.query(
    `SELECT f.id AS friendship_id, u.id, u.email, u.display_name, u.avatar_seed
     FROM friendships f
     JOIN users u ON u.id = f.addressee_id
     WHERE f.requester_id=$1 AND f.status='pending'
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return r.rows;
}

export async function relationshipBetween(userA, userB) {
  if (userA === userB) return "self";
  const r = await pool.query(
    `SELECT * FROM friendships
     WHERE (requester_id=$1 AND addressee_id=$2)
        OR (requester_id=$2 AND addressee_id=$1)`,
    [userA, userB]
  );
  if (!r.rows[0]) return "none";
  const f = r.rows[0];
  if (f.status === "accepted") return "friends";
  if (f.status === "pending" && f.requester_id === userA) return "outgoing";
  if (f.status === "pending" && f.addressee_id === userA) return "incoming";
  return f.status;
}
