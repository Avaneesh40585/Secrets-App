import { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth.js";
import * as groupsDb from "../db/groups.js";
import * as posts from "../db/posts.js";
import * as reactionsDb from "../db/reactions.js";
import * as achievements from "../db/achievements.js";
import { getCodename, getAvatarColors, getInitial } from "../db/codenames.js";
import { decoratePost } from "./feed.js";

const router = Router();

router.get("/groups", ensureAuthenticated, async (req, res) => {
  const list = await groupsDb.listAll(req.user.id);
  res.render("groups", {
    pageTitle: "Groups",
    activePage: "groups",
    groups: list,
  });
});

router.get("/groups/create", ensureAuthenticated, (req, res) => {
  res.render("group-create", {
    pageTitle: "Create group",
    activePage: "groups",
  });
});

router.post("/groups/create", ensureAuthenticated, async (req, res) => {
  const name = (req.body.name || "").trim().substring(0, 100);
  const description = (req.body.description || "").trim().substring(0, 500) || null;
  const is_private = req.body.is_private === "true" || req.body.is_private === "on";

  if (!name) return res.redirect("/groups/create");

  const group = await groupsDb.create({
    name,
    description,
    creator_id: req.user.id,
    is_private,
  });

  achievements.check(req.user.id).catch(() => {});
  res.redirect(`/groups/${group.id}`);
});

router.get("/groups/:id", ensureAuthenticated, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const group = await groupsDb.getById(id, req.user.id);
  if (!group) return res.status(404).send("Group not found");
  if (group.is_private && !group.is_member) {
    return res.status(403).render("groups", {
      pageTitle: "Groups",
      activePage: "groups",
      groups: [],
      error: "This group is private",
    });
  }

  const members = await groupsDb.listMembers(id);
  const decoratedMembers = members.map(m => ({
    ...m,
    codename: getCodename(m.id),
    initial: getInitial(m.display_name, getCodename(m.id), m.email),
    avatarColors: getAvatarColors(m.avatar_seed || String(m.id)),
  }));

  const groupPosts = await posts.getByGroup(id, { limit: 30 });
  const reactionMap = await reactionsDb.bulkUserReactions(req.user.id, groupPosts.map(p => p.id));

  res.render("group-detail", {
    pageTitle: group.name,
    activePage: "groups",
    group,
    members: decoratedMembers,
    posts: groupPosts.map(p => decoratePost(p, reactionMap)),
  });
});

router.post("/groups/:id/join", ensureAuthenticated, async (req, res) => {
  await groupsDb.join(parseInt(req.params.id, 10), req.user.id);
  res.redirect(`/groups/${req.params.id}`);
});

router.post("/groups/:id/leave", ensureAuthenticated, async (req, res) => {
  await groupsDb.leave(parseInt(req.params.id, 10), req.user.id);
  res.redirect("/groups");
});

export default router;
