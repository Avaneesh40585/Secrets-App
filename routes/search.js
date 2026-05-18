import { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth.js";
import { pool } from "../db/index.js";
import { getCodename, getAvatarColors, getInitial } from "../db/codenames.js";
import * as postsDb from "../db/posts.js";
import * as reactions from "../db/reactions.js";

const router = Router();

function decoratePost(p, reactionMap = {}) {
  const codename = getCodename(p.user_id);
  const initial = getInitial(p.author_display_name, codename, p.author_email);
  const colors = getAvatarColors(p.author_avatar_seed || String(p.user_id));
  return {
    ...p,
    codename,
    initial,
    avatar_c1: colors.c1,
    avatar_c2: colors.c2,
    user_reaction: reactionMap[p.id] || null,
  };
}

router.get("/search", ensureAuthenticated, async (req, res) => {
  const q = (req.query.q || '').trim().slice(0, 100);

  if (!q) {
    return res.render("search", {
      pageTitle: "Search",
      activePage: "search",
      searchQuery: '',
      postResults: [],
      userResults: [],
      tagResults: [],
    });
  }

  const likeQ = `%${q}%`;

  const [postRows, userRows, tagRows] = await Promise.all([
    pool.query(
      `SELECT p.*, u.email AS author_email, u.display_name AS author_display_name,
         u.avatar_seed AS author_avatar_seed,
         (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) AS reaction_count,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
         (SELECT COUNT(*) FROM posts pr WHERE pr.parent_post_id = p.id) AS reply_count,
         false AS bookmarked
       FROM posts p JOIN users u ON u.id = p.user_id
       WHERE p.content ILIKE $1
         AND (p.is_whisper = false OR p.whisper_views_remaining > 0)
       ORDER BY p.created_at DESC LIMIT 20`,
      [likeQ]
    ),
    pool.query(
      `SELECT id, display_name, email, avatar_seed
       FROM users
       WHERE (display_name ILIKE $1 OR email ILIKE $1)
       LIMIT 12`,
      [likeQ]
    ),
    pool.query(
      `SELECT tag, COUNT(*)::int AS count
       FROM post_hashtags
       WHERE tag ILIKE $1
       GROUP BY tag ORDER BY count DESC LIMIT 10`,
      [`${q.toLowerCase().replace(/[^a-z0-9_]/g, '')}%`]
    ),
  ]);

  const reactionMap = await reactions.bulkUserReactions(req.user.id, postRows.rows.map(p => p.id));

  const userResults = userRows.rows.map(u => {
    const codename = getCodename(u.id);
    const colors = getAvatarColors(u.avatar_seed || String(u.id));
    return {
      id: u.id,
      codename,
      displayName: u.display_name,
      initial: getInitial(u.display_name, codename, u.email),
      avatar_c1: colors.c1,
    };
  });

  res.render("search", {
    pageTitle: `Search: ${q}`,
    activePage: "search",
    searchQuery: q,
    postResults: postRows.rows.map(p => decoratePost(p, reactionMap)),
    userResults,
    tagResults: tagRows.rows,
  });
});

export default router;
