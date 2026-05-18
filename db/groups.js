import { pool } from "./index.js";

export async function listAll(userId) {
  const r = await pool.query(
    `SELECT g.*,
            (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count,
            EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id=g.id AND gm.user_id=$1) AS is_member
     FROM groups g
     WHERE g.is_private = false OR EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id=g.id AND gm.user_id=$1)
     ORDER BY g.created_at DESC`,
    [userId]
  );
  return r.rows;
}

export async function getById(groupId, userId) {
  const r = await pool.query(
    `SELECT g.*,
            (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count,
            EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id=g.id AND gm.user_id=$2) AS is_member
     FROM groups g WHERE g.id = $1`,
    [groupId, userId]
  );
  return r.rows[0] || null;
}

export async function create({ name, description, creator_id, is_private = false }) {
  const r = await pool.query(
    `INSERT INTO groups (name, description, creator_id, is_private)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, description || null, creator_id, is_private]
  );
  // Creator is auto-admin member
  await pool.query(
    `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')`,
    [r.rows[0].id, creator_id]
  );
  return r.rows[0];
}

export async function join(groupId, userId) {
  const r = await pool.query(
    `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING RETURNING *`,
    [groupId, userId]
  );
  return r.rows[0] || null;
}

export async function leave(groupId, userId) {
  const r = await pool.query(
    `DELETE FROM group_members WHERE group_id=$1 AND user_id=$2 RETURNING *`,
    [groupId, userId]
  );
  return r.rows[0] || null;
}

export async function listMembers(groupId) {
  const r = await pool.query(
    `SELECT gm.role, gm.joined_at, u.id, u.email, u.display_name, u.avatar_seed
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY (gm.role='admin') DESC, gm.joined_at`,
    [groupId]
  );
  return r.rows;
}

export async function isMember(groupId, userId) {
  const r = await pool.query(
    "SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2",
    [groupId, userId]
  );
  return r.rowCount > 0;
}
