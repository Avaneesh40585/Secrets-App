import express from "express";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection cannot be established
});

// --- ROUTES ---
app.get("/", (req, res) => res.render("home.ejs"));

app.get("/login", (req, res) => res.render("login.ejs"));

app.get("/register", (req, res) => res.render("register.ejs"));

app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);
    res.redirect("/");
  });
});

app.get("/secrets", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      // Check if user has shared a secret
      const userSecretCheck = await db.query(
        `SELECT secret FROM users WHERE email = $1`,
        [req.user.email]
      );
      
      const userHasSecret = userSecretCheck.rows[0]?.secret;
      
      if (!userHasSecret) {
        return res.render("secrets.ejs", { 
          secrets: ["Share a secret first to see what others have shared!"],
          needsSecret: true 
        });
      }
      
      // Get all secrets from all users
      const result = await db.query(
        `SELECT secret FROM users WHERE secret IS NOT NULL AND secret != '' ORDER BY RANDOM()`
      );
      
      const secrets = result.rows.map(row => row.secret);
      res.render("secrets.ejs", { secrets: secrets, needsSecret: false });
      
    } catch (err) {
      console.log(err);
      res.render("secrets.ejs", { secrets: ["Error loading secrets."] });
    }
  } else {
    res.redirect("/login");
  }
});


app.get("/submit", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      // Get user's current secret
      const result = await db.query(
        `SELECT secret FROM users WHERE email = $1`,
        [req.user.email]
      );
      
      const currentSecret = result.rows[0]?.secret || null;
      res.render("submit.ejs", { currentSecret: currentSecret });
    } catch (err) {
      console.log(err);
      res.render("submit.ejs", { currentSecret: null });
    }
  } else {
    res.redirect("/login");
  }
});


app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

// --- USER REGISTRATION WITH VALIDATION ---
app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  // Input validation
  if (!email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
    return res.render("register.ejs", { error: "Invalid email format." });
  }
  if (!password || password.length < 6) {
    return res.render("register.ejs", { error: "Password must be at least 6 characters." });
  }

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (checkResult.rows.length > 0) {
      return res.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
          return res.render("register.ejs", { error: "Server error. Please try again." });
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password, provider) VALUES ($1, $2, $3) RETURNING *",
            [email, hash, "local"]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            if (err) {
              return res.render("register.ejs", { error: "Login failed." });
            }
            res.redirect("/secrets");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
    res.render("register.ejs", { error: "Registration failed." });
  }
});

// --- SECRET SUBMISSION ---
app.post("/submit", async (req, res) => {
  const submittedSecret = req.body.secret;
  try {
    await db.query(`UPDATE users SET secret = $1 WHERE email = $2`, [
      submittedSecret,
      req.user.email,
    ]);
    res.redirect("/secrets");
  } catch (err) {
    console.log(err);
    res.redirect("/secrets");
  }
});

// --- PASSPORT LOCAL STRATEGY ---
passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [username]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        // Don't allow login for non-local users
        if (user.provider !== "local") {
          return cb(null, false);
        }
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) return cb(err);
          return cb(null, valid ? user : false);
        });
      } else {
        return cb(null, false);
      }
    } catch (err) {
      cb(err);
    }
  })
);

// --- PASSPORT GOOGLE STRATEGY ---
passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password, provider) VALUES ($1, $2, $3) RETURNING *",
            [profile.email, null, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        cb(err);
      }
    }
  )
);

// --- SERIALIZATION (STORE ONLY USER ID IN SESSION) ---
passport.serializeUser((user, cb) => cb(null, user.id));
passport.deserializeUser(async (id, cb) => {
  try {
    const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    if (rows.length > 0) {
      cb(null, rows[0]);
    } else {
      cb(null, false);
    }
  } catch (err) {
    cb(err);
  }
});

// --- GRACEFUL SHUTDOWN ---
process.on('SIGINT', () => {
  db.end(() => {
    console.log('Pool has ended');
    process.exit(0);
  });
});

// --- SERVER START ---
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
