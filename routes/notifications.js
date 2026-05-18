import { Router } from "express";
import { ensureAuthenticated, attachPulse } from "../middleware/auth.js";
import * as notifications from "../db/notifications.js";

const router = Router();

const ICONS = {
  friend_request: "person_add",
  friend_accept: "group_add",
  reaction: "favorite",
  comment: "chat_bubble",
  group_invite: "forum",
  achievement: "emoji_events",
};

router.get("/notifications", ensureAuthenticated, attachPulse, async (req, res) => {
  const list = await notifications.listForUser(req.user.id);
  // Mark all read after viewing
  await notifications.markAllRead(req.user.id);
  res.locals.unreadCount = 0;

  res.render("notifications", {
    pageTitle: "Notifications",
    activePage: "notifications",
    notifications: list.map(n => ({
      ...n,
      icon: ICONS[n.type] || "notifications",
    })),
  });
});

router.post("/notifications/read/:id", ensureAuthenticated, async (req, res) => {
  await notifications.markRead(parseInt(req.params.id, 10), req.user.id);
  if (req.accepts("html")) return res.redirect("/notifications");
  res.json({ ok: true });
});

export default router;
