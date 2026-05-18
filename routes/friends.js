import { Router } from "express";
import { ensureAuthenticated, attachPulse } from "../middleware/auth.js";
import * as friendsDb from "../db/friends.js";
import * as users from "../db/users.js";
import * as notifications from "../db/notifications.js";
import * as achievements from "../db/achievements.js";
import { getCodename, getAvatarColors, getInitial } from "../db/codenames.js";

const router = Router();

function decorateUser(u) {
  const codename = getCodename(u.id);
  return {
    ...u,
    codename,
    initial: getInitial(u.display_name, codename, u.email),
    avatarColors: getAvatarColors(u.avatar_seed || String(u.id)),
  };
}

router.get("/friends", ensureAuthenticated, attachPulse, async (req, res) => {
  const [friends, incoming, outgoing] = await Promise.all([
    friendsDb.listFriends(req.user.id),
    friendsDb.listIncoming(req.user.id),
    friendsDb.listOutgoing(req.user.id),
  ]);

  res.render("friends", {
    pageTitle: "Friends",
    activePage: "friends",
    tab: req.query.tab || "friends",
    friends: friends.map(decorateUser),
    incoming: incoming.map(decorateUser),
    outgoing: outgoing.map(decorateUser),
    searchQuery: "",
    searchResults: null,
  });
});

router.get("/friends/search", ensureAuthenticated, async (req, res) => {
  const q = (req.query.q || "").trim();
  let searchResults = null;
  if (q.length >= 2) {
    const found = await users.searchUsers(q, req.user.id);
    // Annotate with relationship state
    searchResults = await Promise.all(found.map(async (u) => {
      const rel = await friendsDb.relationshipBetween(req.user.id, u.id);
      return { ...decorateUser(u), relationship: rel };
    }));
  }

  res.render("friends", {
    pageTitle: "Search",
    activePage: "friends",
    tab: "search",
    friends: [], incoming: [], outgoing: [],
    searchQuery: q,
    searchResults,
  });
});

router.post("/friends/request/:userId", ensureAuthenticated, async (req, res) => {
  const targetId = parseInt(req.params.userId, 10);
  const fr = await friendsDb.sendRequest(req.user.id, targetId);
  if (fr) {
    const fromCodename = getCodename(req.user.id);
    await notifications.create({
      user_id: targetId,
      type: "friend_request",
      reference_id: fr.id,
      message: `${fromCodename} wants to be friends`,
    });
  }
  if (req.accepts("html")) return res.redirect(req.get("Referrer") || "/friends");
  res.json({ ok: !!fr });
});

router.post("/friends/accept/:friendshipId", ensureAuthenticated, async (req, res) => {
  const id = parseInt(req.params.friendshipId, 10);
  const fr = await friendsDb.accept(id, req.user.id);
  if (fr) {
    const myCodename = getCodename(req.user.id);
    await notifications.create({
      user_id: fr.requester_id,
      type: "friend_accept",
      reference_id: fr.id,
      message: `${myCodename} accepted your friend request`,
    });
    achievements.check(req.user.id).catch(() => {});
    achievements.check(fr.requester_id).catch(() => {});
  }
  if (req.accepts("html")) return res.redirect("/friends");
  res.json({ ok: !!fr });
});

router.post("/friends/decline/:friendshipId", ensureAuthenticated, async (req, res) => {
  const id = parseInt(req.params.friendshipId, 10);
  const fr = await friendsDb.decline(id, req.user.id);
  if (req.accepts("html")) return res.redirect("/friends");
  res.json({ ok: !!fr });
});

router.post("/friends/block/:userId", ensureAuthenticated, async (req, res) => {
  const targetId = parseInt(req.params.userId, 10);
  if (targetId === req.user.id) return res.redirect(req.get("Referrer") || "/friends");
  const { pool } = await import("../db/index.js");
  await pool.query(
    `INSERT INTO friendships (requester_id, addressee_id, status)
     VALUES ($1, $2, 'blocked')
     ON CONFLICT (requester_id, addressee_id)
       DO UPDATE SET status = 'blocked'`,
    [req.user.id, targetId]
  );
  if (req.accepts("html")) return res.redirect(req.get("Referrer") || "/friends");
  res.json({ ok: true });
});

router.post("/friends/unblock/:userId", ensureAuthenticated, async (req, res) => {
  const targetId = parseInt(req.params.userId, 10);
  const { pool } = await import("../db/index.js");
  await pool.query(
    `DELETE FROM friendships
     WHERE status = 'blocked'
       AND ((requester_id = $1 AND addressee_id = $2)
         OR (requester_id = $2 AND addressee_id = $1))`,
    [req.user.id, targetId]
  );
  if (req.accepts("html")) return res.redirect(req.get("Referrer") || "/friends");
  res.json({ ok: true });
});

export default router;
