import { Router } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import bcrypt from "bcrypt";
import * as users from "../db/users.js";

const router = Router();
const SALT_ROUNDS = 10;

// ============================================================
// Passport strategies
// ============================================================
passport.use("local", new LocalStrategy(async function verify(username, password, cb) {
  try {
    const user = await users.findByEmail(username);
    if (!user) return cb(null, false, { message: "Email not registered" });
    if (user.provider !== "local") return cb(null, false, { message: `Use ${user.provider} sign-in for this account` });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return cb(null, false, { message: "Incorrect password" });
    return cb(null, user);
  } catch (err) { return cb(err); }
}));

passport.use("google", new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://secrets-app-c07z.onrender.com/auth/google/secrets"
      : "http://localhost:3000/auth/google/secrets"),
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
}, async (accessToken, refreshToken, profile, cb) => {
  try {
    const email = profile.email;
    let user = await users.findByEmail(email);
    if (!user) user = await users.createUser({ email, password: null, provider: "google" });
    return cb(null, user);
  } catch (err) { return cb(err); }
}));

passport.serializeUser((user, cb) => cb(null, user.id));
passport.deserializeUser(async (id, cb) => {
  try { cb(null, await users.findById(id)); } catch (e) { cb(e); }
});

// ============================================================
// Routes
// ============================================================
router.get("/login", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/feed");
  res.render("login", { error: req.query.error });
});

router.get("/register", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/feed");
  res.render("register", { error: null });
});

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.render("login", { error: (info && info.message) || "Sign-in failed" });
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect("/feed");
    });
  })(req, res, next);
});

router.post("/register", async (req, res, next) => {
  const email = (req.body.username || "").trim().toLowerCase();
  const password = req.body.password || "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.render("register", { error: "Please enter a valid email" });
  }
  if (password.length < 6) {
    return res.render("register", { error: "Password must be at least 6 characters" });
  }
  try {
    const existing = await users.findByEmail(email);
    if (existing) return res.render("register", { error: "Email already registered" });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await users.createUser({ email, password: hash, provider: "local" });
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect("/feed");
    });
  } catch (err) {
    console.error("Register error:", err);
    res.render("register", { error: "Something went wrong. Please try again." });
  }
});

router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/auth/google/secrets", passport.authenticate("google", {
  successRedirect: "/feed",
  failureRedirect: "/login",
}));

export default router;
