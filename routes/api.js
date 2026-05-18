import { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth.js";
import * as reactions from "../db/reactions.js";
import * as comments from "../db/comments.js";
import * as notifications from "../db/notifications.js";
import * as achievements from "../db/achievements.js";
import * as posts from "../db/posts.js";
import * as bookmarks from "../db/bookmarks.js";
import * as reports from "../db/reports.js";
import { getCodename, getAvatarColors, getInitial } from "../db/codenames.js";

const router = Router();
router.use(ensureAuthenticated);

// React to a post
router.post("/api/post/:id/react", async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const type = (req.body.type || "like").toString();
  const result = await reactions.toggle(req.user.id, postId, type);
  const count = await reactions.countForPost(postId);

  // Notify post owner on new reaction
  if (result.isNew) {
    const ownerId = await comments.getPostOwner(postId);
    if (ownerId && ownerId !== req.user.id) {
      const fromCodename = getCodename(req.user.id);
      await notifications.create({
        user_id: ownerId,
        type: "reaction",
        reference_id: postId,
        message: `${fromCodename} reacted to your secret`,
      });
    }
    achievements.check(req.user.id).catch(() => {});
    if (ownerId) achievements.check(ownerId).catch(() => {});
  }

  res.json({ active: result.active, type: result.type, count });
});

// List comments for a post
router.get("/api/post/:id/comments", async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const list = await comments.listForPost(postId);
  const decorated = list.map(c => {
    const codename = getCodename(c.user_id);
    const colors = getAvatarColors(c.avatar_seed || String(c.user_id));
    return {
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      codename,
      initial: getInitial(c.is_anonymous ? null : c.display_name, codename, c.email),
      avatar_c1: colors.c1,
      avatar_c2: colors.c2,
    };
  });
  res.json({ comments: decorated });
});

// Add a comment
router.post("/api/post/:id/comment", async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const content = (req.body.content || "").trim();
  if (!content || content.length > 500) return res.status(400).json({ error: "Invalid content" });

  const c = await comments.create({
    post_id: postId,
    user_id: req.user.id,
    content,
    is_anonymous: true,
  });

  // Notify post owner
  const ownerId = await comments.getPostOwner(postId);
  if (ownerId && ownerId !== req.user.id) {
    const fromCodename = getCodename(req.user.id);
    await notifications.create({
      user_id: ownerId,
      type: "comment",
      reference_id: postId,
      message: `${fromCodename} commented on your secret`,
    });
  }

  const codename = getCodename(req.user.id);
  const colors = getAvatarColors(req.user.avatar_seed || String(req.user.id));

  res.json({
    comment: {
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      codename,
      initial: getInitial(null, codename, req.user.email),
      avatar_c1: colors.c1,
      avatar_c2: colors.c2,
    },
  });
});

// Delete a post (used by client app.js deletePost)
router.post("/api/post/:id/delete", async (req, res) => {
  const ok = await posts.deleteOwn(parseInt(req.params.id, 10), req.user.id);
  res.json({ ok });
});

// Toggle bookmark
router.post("/api/post/:id/bookmark", async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const bookmarked = await bookmarks.toggle(req.user.id, postId);
  res.json({ bookmarked });
});

// Report a post
router.post("/api/post/:id/report", async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const reason = (req.body.reason || '').toString().trim().slice(0, 100);
  await reports.create({ reporter_id: req.user.id, post_id: postId, reason });
  res.json({ ok: true });
});

export default router;
