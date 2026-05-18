import { pool } from "./index.js";

const HASHTAG_RE = /#([a-zA-Z0-9_]{1,40})/g;

export function extractHashtags(text) {
  const set = new Set();
  for (const m of (text || '').matchAll(HASHTAG_RE)) set.add(m[1].toLowerCase());
  return [...set];
}

export async function insertHashtags(postId, tags) {
  if (!tags.length) return;
  const values = tags.map((_, i) => `($1, $${i + 2})`).join(', ');
  await pool.query(
    `INSERT INTO post_hashtags (post_id, tag) VALUES ${values} ON CONFLICT DO NOTHING`,
    [postId, ...tags]
  );
}

// Base SELECT — joins user info + reaction count + comment count, in a single row
const BASE_SELECT = `
  SELECT
    p.*,
    u.email AS author_email,
    u.display_name AS author_display_name,
    u.avatar_seed AS author_avatar_seed,
    (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) AS reaction_count,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
    (SELECT COUNT(*) FROM posts pr WHERE pr.parent_post_id = p.id) AS reply_count
  FROM posts p
  JOIN users u ON p.user_id = u.id
`;

function bookmarkSelect(userId) {
  if (!userId) return 'false AS bookmarked';
  return `EXISTS(SELECT 1 FROM bookmarks b WHERE b.post_id = p.id AND b.user_id = ${parseInt(userId, 10)}) AS bookmarked`;
}

function blockFilter(userId) {
  if (!userId) return '';
  const id = parseInt(userId, 10);
  return `AND NOT EXISTS (
    SELECT 1 FROM friendships bf
    WHERE bf.status = 'blocked'
      AND ((bf.requester_id = ${id} AND bf.addressee_id = p.user_id)
        OR (bf.addressee_id = ${id} AND bf.requester_id = p.user_id))
  )`;
}

export async function getFeed({ limit = 20, offset = 0, currentUserId, excludeGroups = true, category } = {}) {
  const groupFilter = excludeGroups ? "AND p.group_id IS NULL" : "";
  const catFilter = category ? `AND p.category = '${category.replace(/'/g, "''")}'` : "";
  const r = await pool.query(
    `SELECT p.*, u.email AS author_email, u.display_name AS author_display_name, u.avatar_seed AS author_avatar_seed,
      (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) AS reaction_count,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
      (SELECT COUNT(*) FROM posts pr WHERE pr.parent_post_id = p.id) AS reply_count,
      ${bookmarkSelect(currentUserId)}
     FROM posts p JOIN users u ON p.user_id = u.id
     WHERE (p.is_whisper = false OR p.whisper_views_remaining > 0 OR p.user_id = $3)
       ${groupFilter}
       AND p.parent_post_id IS NULL
       ${catFilter}
       ${blockFilter(currentUserId)}
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset, currentUserId || null]
  );
  return r.rows;
}

export async function getTrending({ limit = 20, currentUserId } = {}) {
  const r = await pool.query(
    `SELECT p.*, u.email AS author_email, u.display_name AS author_display_name, u.avatar_seed AS author_avatar_seed,
      (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) AS reaction_count,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
      (SELECT COUNT(*) FROM posts pr WHERE pr.parent_post_id = p.id) AS reply_count,
      ${bookmarkSelect(currentUserId)}
     FROM posts p JOIN users u ON p.user_id = u.id
     WHERE (p.is_whisper = false OR p.whisper_views_remaining > 0 OR p.user_id = $2)
       AND p.group_id IS NULL
       AND p.parent_post_id IS NULL
       AND p.created_at > NOW() - INTERVAL '7 days'
       ${blockFilter(currentUserId)}
     ORDER BY
       (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id)::float /
       POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at))/3600 + 2, 1.5) DESC,
       p.created_at DESC
     LIMIT $1`,
    [limit, currentUserId || null]
  );
  return r.rows;
}

export async function getFriendsFeed({ userId, limit = 20, offset = 0 } = {}) {
  const r = await pool.query(
    `${BASE_SELECT}
     WHERE p.user_id IN (
       SELECT CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
       FROM friendships f
       WHERE f.status='accepted' AND ($1 IN (f.requester_id, f.addressee_id))
     )
     AND p.group_id IS NULL
     AND (p.is_whisper = false OR p.whisper_views_remaining > 0)
     AND p.parent_post_id IS NULL
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return r.rows;
}

export async function getById(postId, currentUserId) {
  const r = await pool.query(
    `${BASE_SELECT} WHERE p.id = $1`,
    [postId]
  );
  return r.rows[0] || null;
}

export async function getByUser(userId, { limit = 50 } = {}) {
  const r = await pool.query(
    `${BASE_SELECT}
     WHERE p.user_id = $1
       AND p.group_id IS NULL
       AND p.parent_post_id IS NULL
     ORDER BY p.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return r.rows;
}

export async function getByGroup(groupId, { limit = 50 } = {}) {
  const r = await pool.query(
    `${BASE_SELECT}
     WHERE p.group_id = $1
       AND p.parent_post_id IS NULL
     ORDER BY p.created_at DESC
     LIMIT $2`,
    [groupId, limit]
  );
  return r.rows;
}

export async function getReplies(parentPostId) {
  const r = await pool.query(
    `${BASE_SELECT}
     WHERE p.parent_post_id = $1
     ORDER BY p.created_at ASC`,
    [parentPostId]
  );
  return r.rows;
}

export async function create({ user_id, content, category, is_anonymous = true, is_whisper = false, parent_post_id = null, group_id = null }) {
  const whisperViews = is_whisper ? 10 : null;
  const r = await pool.query(
    `INSERT INTO posts (user_id, content, category, is_anonymous, is_whisper, whisper_views_remaining, parent_post_id, group_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [user_id, content, category || "general", is_anonymous, is_whisper, whisperViews, parent_post_id, group_id]
  );
  const post = r.rows[0];
  const tags = extractHashtags(content);
  if (tags.length) await insertHashtags(post.id, tags).catch(() => {});
  return post;
}

export async function getByHashtag(tag, { limit = 20, offset = 0, currentUserId } = {}) {
  const r = await pool.query(
    `SELECT p.*, u.email AS author_email, u.display_name AS author_display_name, u.avatar_seed AS author_avatar_seed,
      (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) AS reaction_count,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
      (SELECT COUNT(*) FROM posts pr WHERE pr.parent_post_id = p.id) AS reply_count,
      ${bookmarkSelect(currentUserId)}
     FROM posts p
     JOIN users u ON p.user_id = u.id
     JOIN post_hashtags ph ON ph.post_id = p.id
     WHERE ph.tag = $1
       AND (p.is_whisper = false OR p.whisper_views_remaining > 0 OR p.user_id = $4)
       ${blockFilter(currentUserId)}
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [tag.toLowerCase(), limit, offset, currentUserId || null]
  );
  return r.rows;
}

export async function deleteOwn(postId, userId) {
  const r = await pool.query(
    "DELETE FROM posts WHERE id=$1 AND user_id=$2 RETURNING id",
    [postId, userId]
  );
  return r.rowCount > 0;
}

export async function decrementWhisper(postId) {
  const r = await pool.query(
    `UPDATE posts
     SET whisper_views_remaining = whisper_views_remaining - 1
     WHERE id=$1 AND is_whisper=true AND whisper_views_remaining > 0
     RETURNING whisper_views_remaining`,
    [postId]
  );
  return r.rows[0]?.whisper_views_remaining ?? null;
}
