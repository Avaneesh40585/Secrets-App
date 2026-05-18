import { pool } from "./index.js";

export async function create({ reporter_id, post_id, reason }) {
  const { rows } = await pool.query(
    `INSERT INTO reports (reporter_id, post_id, reason)
     VALUES ($1, $2, $3)
     ON CONFLICT (reporter_id, post_id) DO NOTHING
     RETURNING id`,
    [reporter_id, post_id, reason || null]
  );
  return rows[0] || null;
}
