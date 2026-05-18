import { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth.js";
import * as posts from "../db/posts.js";
import * as reactions from "../db/reactions.js";
import { getCodename, getAvatarColors, getInitial } from "../db/codenames.js";

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

router.get("/hashtag/:tag", ensureAuthenticated, async (req, res) => {
  const tag = req.params.tag.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!tag) return res.redirect('/feed');
  const all = await posts.getByHashtag(tag, { limit: 30, currentUserId: req.user.id });
  const reactionMap = await reactions.bulkUserReactions(req.user.id, all.map(p => p.id));
  res.render("hashtag", {
    pageTitle: `#${tag}`,
    activePage: "feed",
    tag,
    posts: all.map(p => decoratePost(p, reactionMap)),
  });
});

export default router;
