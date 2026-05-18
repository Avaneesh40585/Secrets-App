import { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth.js";
import * as posts from "../db/posts.js";
import * as achievements from "../db/achievements.js";
import { getCodename } from "../db/codenames.js";
import { decoratePost } from "./feed.js";
import * as reactionsDb from "../db/reactions.js";

const router = Router();

// Submit form (GET)
router.get("/submit", ensureAuthenticated, async (req, res) => {
  let replyTo = null;
  if (req.query.reply) {
    const parent = await posts.getById(parseInt(req.query.reply, 10), req.user.id);
    if (parent) {
      replyTo = {
        id: parent.id,
        content: parent.content,
        codename: getCodename(parent.user_id),
      };
    }
  }
  const promptText = req.query.prompt ? decodeURIComponent(req.query.prompt).slice(0, 200) : null;
  res.render("submit", { pageTitle: "Share", activePage: "", replyTo, promptText });
});

// Create post (POST)
router.post("/post/create", ensureAuthenticated, async (req, res) => {
  const content = (req.body.content || "").trim();
  const category = (req.body.category || "general").substring(0, 32);
  const isWhisper = req.body.is_whisper === "true" || req.body.is_whisper === "on";
  const parentPostId = req.body.parent_post_id ? parseInt(req.body.parent_post_id, 10) : null;
  const groupId = req.body.group_id ? parseInt(req.body.group_id, 10) : null;

  if (!content || content.length > 500) {
    return res.redirect("/submit");
  }

  await posts.create({
    user_id: req.user.id,
    content,
    category,
    is_anonymous: true,
    is_whisper: isWhisper,
    parent_post_id: parentPostId,
    group_id: groupId,
  });

  // Trigger achievement check (non-blocking)
  achievements.check(req.user.id).catch(() => {});

  if (groupId) return res.redirect(`/groups/${groupId}`);
  if (parentPostId) return res.redirect(`/post/${parentPostId}`);
  res.redirect("/feed");
});

// Single post view (with chain/replies)
router.get("/post/:id", ensureAuthenticated, async (req, res) => {
  const post = await posts.getById(parseInt(req.params.id, 10), req.user.id);
  if (!post) return res.status(404).send("Post not found");

  // Decrement whisper view if applicable and not owner
  if (post.is_whisper && post.user_id !== req.user.id && post.whisper_views_remaining > 0) {
    const remaining = await posts.decrementWhisper(post.id);
    if (remaining != null) post.whisper_views_remaining = remaining;
  }

  const replies = await posts.getReplies(post.id);
  const reactionMap = await reactionsDb.bulkUserReactions(req.user.id, [post.id, ...replies.map(r => r.id)]);

  res.render("post-view", {
    pageTitle: "Post",
    activePage: "",
    post: decoratePost(post, reactionMap),
    replies: replies.map(r => decoratePost(r, reactionMap)),
  });
});

// Delete own post
router.post("/post/:id/delete", ensureAuthenticated, async (req, res) => {
  await posts.deleteOwn(parseInt(req.params.id, 10), req.user.id);
  res.redirect("/feed");
});

export default router;
