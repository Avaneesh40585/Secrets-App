import { Router } from "express";
import { ensureAuthenticated, attachPulse } from "../middleware/auth.js";
import * as users from "../db/users.js";
import * as posts from "../db/posts.js";
import * as friends from "../db/friends.js";
import * as achievements from "../db/achievements.js";
import { getCodename, getAvatarColors, getInitial } from "../db/codenames.js";
import { decoratePost } from "./feed.js";
import * as reactionsDb from "../db/reactions.js";

const router = Router();

router.get("/profile", ensureAuthenticated, attachPulse, async (req, res) => {
  const u = await users.findById(req.user.id);
  const stats = await users.getStats(u.id);
  const userPosts = await posts.getByUser(u.id, { limit: 20 });
  const reactionMap = await reactionsDb.bulkUserReactions(u.id, userPosts.map(p => p.id));
  const earned = await achievements.listForUser(u.id);
  const codename = getCodename(u.id);
  const avatarColors = getAvatarColors(u.avatar_seed || String(u.id));

  res.render("profile", {
    pageTitle: "Profile",
    activePage: "profile",
    profileUser: u,
    codename,
    initial: getInitial(u.display_name, codename, u.email),
    avatarColors,
    stats,
    posts: userPosts.map(p => decoratePost(p, reactionMap)),
    achievements: earned,
    isOwn: true,
  });
});

router.get("/profile/edit", ensureAuthenticated, async (req, res) => {
  const u = await users.findById(req.user.id);
  res.render("profile-edit", {
    pageTitle: "Edit Profile",
    activePage: "profile",
    profileUser: u,
  });
});

router.post("/profile/edit", ensureAuthenticated, async (req, res) => {
  const display_name = (req.body.display_name || "").trim().substring(0, 50) || null;
  const bio = (req.body.bio || "").trim().substring(0, 280) || null;
  await users.updateProfile(req.user.id, { display_name, bio });
  res.redirect("/profile");
});

router.get("/user/:id", ensureAuthenticated, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === req.user.id) return res.redirect("/profile");

  const u = await users.findById(id);
  if (!u) return res.status(404).send("User not found");

  const stats = await users.getStats(u.id);
  const userPosts = await posts.getByUser(u.id, { limit: 20 });
  const reactionMap = await reactionsDb.bulkUserReactions(req.user.id, userPosts.map(p => p.id));
  const earned = await achievements.listForUser(u.id);
  const codename = getCodename(u.id);
  const avatarColors = getAvatarColors(u.avatar_seed || String(u.id));
  const relationship = await friends.relationshipBetween(req.user.id, u.id);

  res.render("profile", {
    pageTitle: codename,
    activePage: "",
    profileUser: u,
    codename,
    initial: getInitial(u.display_name, codename, u.email),
    avatarColors,
    stats,
    posts: userPosts.map(p => decoratePost(p, reactionMap)),
    achievements: earned,
    isOwn: false,
    relationship,
  });
});

export default router;
