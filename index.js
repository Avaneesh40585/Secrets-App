import express from "express";
import session from "express-session";
import passport from "passport";
import env from "dotenv";

import { initializeDatabase, shutdown } from "./db/index.js";
import { attachUnreadCount, attachLocals } from "./middleware/auth.js";
import * as users from "./db/users.js";

import authRouter from "./routes/auth.js";
import pagesRouter from "./routes/pages.js";
import feedRouter from "./routes/feed.js";
import postsRouter from "./routes/posts.js";
import profileRouter from "./routes/profile.js";
import friendsRouter from "./routes/friends.js";
import groupsRouter from "./routes/groups.js";
import notificationsRouter from "./routes/notifications.js";
import wallRouter from "./routes/wall.js";
import apiRouter from "./routes/api.js";
import bookmarksRouter from "./routes/bookmarks.js";
import searchRouter from "./routes/search.js";
import hashtagRouter from "./routes/hashtag.js";

env.config();

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 },
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());

// Update last_seen + inject unreadCount + locals on every request
app.use(async (req, res, next) => {
  if (req.user) users.updateLastSeen(req.user.id).catch(() => {});
  next();
});
app.use(attachUnreadCount);
app.use(attachLocals);

// Mount routers
app.use(authRouter);
app.use(pagesRouter);
app.use(feedRouter);
app.use(postsRouter);
app.use(profileRouter);
app.use(friendsRouter);
app.use(groupsRouter);
app.use(notificationsRouter);
app.use(wallRouter);
app.use(apiRouter);
app.use(bookmarksRouter);
app.use(searchRouter);
app.use(hashtagRouter);

// 404
app.use((req, res) => {
  res.status(404).render("error", {
    pageTitle: "Not found",
    code: 404,
    message: "We couldn't find that page.",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("[error]", err);
  res.status(500).render("error", {
    pageTitle: "Error",
    code: 500,
    message: "Something went wrong on our end.",
  });
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

// Start
console.log("Starting Secrets...");
initializeDatabase()
  .then(() => {
    const server = app.listen(port, () => console.log(`Server running on port ${port}`));
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${port} already in use — retrying in 1s...`);
        setTimeout(() => server.listen(port), 1000);
      } else {
        console.error("[server error]", err);
        process.exit(1);
      }
    });
  })
  .catch((err) => {
    console.error("Failed to initialize:", err);
    process.exit(1);
  });
