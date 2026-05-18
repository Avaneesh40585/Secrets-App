import { Router } from "express";
import { ensureAuthenticated, attachPulse } from "../middleware/auth.js";
import * as bookmarksDb from "../db/bookmarks.js";
import { getCodename, getAvatarColors, getInitial } from "../db/codenames.js";
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

router.get("/bookmarks", ensureAuthenticated, attachPulse, async (req, res) => {
  const all = await bookmarksDb.listForUser(req.user.id);
  const reactionMap = await reactions.bulkUserReactions(req.user.id, all.map(p => p.id));
  res.render("bookmarks", {
    pageTitle: "Bookmarks",
    activePage: "bookmarks",
    posts: all.map(p => decoratePost(p, reactionMap)),
  });
});

export default router;
