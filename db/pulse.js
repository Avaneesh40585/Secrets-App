import { pool } from "./index.js";
import { getCodename, getAvatarColors, getInitial } from "./codenames.js";
import { getDailyPrompt } from "./prompts.js";

export { getDailyPrompt };

export async function getTrendingHashtags(days = 7, limit = 8) {
  const { rows } = await pool.query(
    `SELECT ph.tag, COUNT(*)::int AS count
     FROM post_hashtags ph
     JOIN posts p ON p.id = ph.post_id
     WHERE p.created_at > NOW() - ($1 || ' days')::INTERVAL
     GROUP BY ph.tag
     ORDER BY count DESC
     LIMIT $2`,
    [days, limit]
  );
  return rows;
}

export async function getWhoToFollow(userId, limit = 3) {
  if (!userId) return [];
  const { rows } = await pool.query(
    `SELECT u.id, u.avatar_seed, u.email, u.display_name,
      (SELECT COUNT(*) FROM friendships f
       WHERE f.status = 'accepted'
         AND (f.requester_id = u.id OR f.addressee_id = u.id))::int AS friend_count
     FROM users u
     WHERE u.id <> $1
       AND NOT EXISTS (
         SELECT 1 FROM friendships f
         WHERE f.status IN ('pending', 'accepted', 'blocked')
           AND ((f.requester_id = $1 AND f.addressee_id = u.id)
             OR (f.addressee_id = $1 AND f.requester_id = u.id))
       )
     ORDER BY friend_count DESC, RANDOM()
     LIMIT $2`,
    [userId, limit]
  );
  return rows.map(u => {
    const codename = getCodename(u.id);
    const colors = getAvatarColors(u.avatar_seed || String(u.id));
    return {
      id: u.id,
      codename,
      initial: getInitial(null, codename, u.email),
      avatar_c1: colors.c1,
    };
  });
}

export async function getFriendActivity(userId, limit = 5) {
  if (!userId) return [];
  const { rows } = await pool.query(
    `(SELECT r.user_id, 'reaction' AS kind, r.created_at, r.post_id AS ref_id,
        u.avatar_seed, u.email, u.display_name
      FROM reactions r
      JOIN users u ON u.id = r.user_id
      WHERE r.user_id IN (
        SELECT CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
        FROM friendships f WHERE f.status = 'accepted'
          AND (f.requester_id = $1 OR f.addressee_id = $1)
      ))
    UNION ALL
    (SELECT p.user_id, 'post' AS kind, p.created_at, p.id AS ref_id,
        u.avatar_seed, u.email, u.display_name
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id IN (
        SELECT CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
        FROM friendships f WHERE f.status = 'accepted'
          AND (f.requester_id = $1 OR f.addressee_id = $1)
      ) AND p.parent_post_id IS NULL AND p.group_id IS NULL)
    ORDER BY created_at DESC
    LIMIT $2`,
    [userId, limit]
  );
  return rows.map(a => {
    const codename = getCodename(a.user_id);
    const icon = a.kind === 'reaction' ? 'favorite' : 'edit_note';
    const verb = a.kind === 'reaction' ? 'reacted to a secret' : 'shared a secret';
    return { codename, icon, verb, href: `/post/${a.ref_id}` };
  });
}

export async function getUserDayStats(userId) {
  if (!userId) return { posts: 0, reactions: 0, comments: 0 };
  const { rows } = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM posts WHERE user_id=$1 AND created_at > NOW() - INTERVAL '1 day')::int AS posts,
      (SELECT COUNT(*) FROM reactions WHERE post_id IN (SELECT id FROM posts WHERE user_id=$1) AND created_at > NOW() - INTERVAL '1 day')::int AS reactions,
      (SELECT COUNT(*) FROM comments WHERE user_id=$1 AND created_at > NOW() - INTERVAL '1 day')::int AS comments`,
    [userId]
  );
  return rows[0] || { posts: 0, reactions: 0, comments: 0 };
}

export async function getOnlineFriends(userId, limit = 8) {
  if (!userId) return [];
  const { rows } = await pool.query(
    `SELECT u.id, u.avatar_seed, u.email, u.display_name
     FROM users u
     WHERE u.id <> $1
       AND u.last_seen_at > NOW() - INTERVAL '5 minutes'
       AND EXISTS (
         SELECT 1 FROM friendships f
         WHERE f.status = 'accepted'
           AND ((f.requester_id = $1 AND f.addressee_id = u.id)
             OR (f.addressee_id = $1 AND f.requester_id = u.id))
       )
     ORDER BY u.last_seen_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows.map(u => {
    const codename = getCodename(u.id);
    const colors = getAvatarColors(u.avatar_seed || String(u.id));
    return {
      id: u.id,
      codename,
      initial: getInitial(null, codename, u.email),
      avatar_c1: colors.c1,
    };
  });
}

export async function getOnThisDay(userId) {
  if (!userId) return null;
  const { rows } = await pool.query(
    `SELECT p.id, p.content, p.created_at, p.user_id,
            u.avatar_seed, u.email, u.display_name,
            EXTRACT(YEAR FROM AGE(NOW(), p.created_at))::int AS years_ago
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.group_id IS NULL
       AND p.is_whisper = false
       AND EXTRACT(MONTH FROM p.created_at) = EXTRACT(MONTH FROM NOW())
       AND EXTRACT(DAY   FROM p.created_at) = EXTRACT(DAY   FROM NOW())
       AND p.created_at < NOW() - INTERVAL '11 months'
       AND (
         p.user_id = $1
         OR p.user_id IN (
           SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END
           FROM friendships
           WHERE status = 'accepted' AND (requester_id = $1 OR addressee_id = $1)
         )
       )
     ORDER BY p.created_at ASC
     LIMIT 1`,
    [userId]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  const codename = getCodename(r.user_id);
  return {
    id: r.id,
    content: r.content,
    user_id: r.user_id,
    codename,
    years_ago: r.years_ago,
  };
}

export async function getPulseData(userId) {
  const [prompt, hashtags, suggestions, activity, dayStats, onlineFriends, onThisDay] = await Promise.all([
    getDailyPrompt(),
    getTrendingHashtags(),
    getWhoToFollow(userId),
    getFriendActivity(userId),
    getUserDayStats(userId),
    getOnlineFriends(userId),
    getOnThisDay(userId),
  ]);
  return { prompt, hashtags, suggestions, activity, dayStats, onlineFriends, onThisDay };
}
