import { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth.js";
import * as posts from "../db/posts.js";
import * as reactionsDb from "../db/reactions.js";
import { decoratePost } from "./feed.js";

const router = Router();

router.get("/confession-wall", ensureAuthenticated, async (req, res) => {
  const recent = await posts.getFeed({ limit: 40, currentUserId: req.user.id });
  const reactionMap = await reactionsDb.bulkUserReactions(req.user.id, recent.map(p => p.id));
  res.render("confession-wall", {
    pageTitle: "Confession Wall",
    activePage: "wall",
    posts: recent.map(p => decoratePost(p, reactionMap)),
  });
});

export default router;
