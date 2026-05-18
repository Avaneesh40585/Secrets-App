import { Router } from "express";
import { ensureAuthenticated, attachPulse } from "../middleware/auth.js";
import * as posts from "../db/posts.js";
import * as reactions from "../db/reactions.js";
import { getCodename, getAvatarColors, getInitial } from "../db/codenames.js";

const router = Router();

function decoratePost(p, userReactionsMap = {}) {
  const codename = getCodename(p.user_id);
  const initial = getInitial(p.author_display_name, codename, p.author_email);
  const avatarColors = getAvatarColors(p.author_avatar_seed || String(p.user_id));
  return {
    ...p,
    display_name: p.is_anonymous ? null : p.author_display_name,
    codename,
    initial,
    avatar_c1: avatarColors.c1,
    avatar_c2: avatarColors.c2,
    user_reaction: userReactionsMap[p.id] || null,
  };
}

const VALID_CATEGORIES = ['general','confession','question','story','advice','vent','joy'];

router.get("/feed", ensureAuthenticated, attachPulse, async (req, res) => {
  const category = VALID_CATEGORIES.includes(req.query.category) ? req.query.category : null;
  const all = await posts.getFeed({ limit: 30, currentUserId: req.user.id, category });
  const reactionMap = await reactions.bulkUserReactions(req.user.id, all.map(p => p.id));
  const decorated = all.map(p => decoratePost(p, reactionMap));
  res.render("feed", {
    pageTitle: "Feed",
    activePage: "feed",
    feedType: "all",
    activeCategory: category || 'all',
    posts: decorated,
  });
});

router.get("/feed/trending", ensureAuthenticated, attachPulse, async (req, res) => {
  const all = await posts.getTrending({ limit: 30, currentUserId: req.user.id });
  const reactionMap = await reactions.bulkUserReactions(req.user.id, all.map(p => p.id));
  res.render("feed", {
    pageTitle: "Trending",
    activePage: "trending",
    feedType: "trending",
    activeCategory: 'all',
    posts: all.map(p => decoratePost(p, reactionMap)),
  });
});

router.get("/feed/friends", ensureAuthenticated, attachPulse, async (req, res) => {
  const all = await posts.getFriendsFeed({ userId: req.user.id, limit: 30 });
  const reactionMap = await reactions.bulkUserReactions(req.user.id, all.map(p => p.id));
  res.render("feed", {
    pageTitle: "Friends Feed",
    activePage: "feed",
    feedType: "friends",
    activeCategory: 'all',
    posts: all.map(p => decoratePost(p, reactionMap)),
  });
});

export default router;
export { decoratePost };
