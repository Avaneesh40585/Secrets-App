# Secrets

An anonymous social platform where users share secrets under rotating pseudonyms. Built with Node.js, Express, PostgreSQL, and EJS. The interface follows Google's Material Design 3 system, matching the aesthetic of Google Tasks, Google Calendar, and Google Drive.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Google OAuth Setup](#google-oauth-setup)
3. [Deploying to Render](#deploying-to-render)
4. [Features](#features)
5. [Tech Stack](#tech-stack)
6. [Project Structure](#project-structure)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)

---

## Quick Start

### Prerequisites

| Requirement | Minimum version |
|---|---|
| Node.js | 18 |
| PostgreSQL | 12 |

### Install and run

```bash
git clone https://github.com/Avaneesh40585/Secrets-App.git
cd Secrets-App
npm install
cp .env.example .env   # fill in your values — see .env.example for all keys
npm run dev            # development with auto-reload
```

Open [http://localhost:3000](http://localhost:3000).

The schema runs automatically on first boot. No separate migration step is needed.

### Demo data

To populate the database with sample users, posts, groups, reactions, and all other features:

```bash
npm run seed
```

This creates eight accounts, all with the password `password123`. Sign in as `demo@secrets.app` to see the app with a full feed, pending friend requests, notifications, bookmarks, and achievements pre-loaded. The seed is safe to run once — it exits early if the demo data already exists.

---

## Google OAuth Setup

Google OAuth is optional — email/password login works without it. To enable it:

**1. Create a Google Cloud project**

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com) and create a new project (or select an existing one).
2. In the left menu go to **APIs & Services → OAuth consent screen**.
3. Choose **External**, fill in the app name and your email, then save.

**2. Create OAuth credentials**

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Set application type to **Web application**.
3. Under **Authorised redirect URIs** add:
   - `http://localhost:3000/auth/google/secrets` — for local development
   - `https://your-app.onrender.com/auth/google/secrets` — for production (replace with your actual Render URL)
4. Click **Create**. Copy the **Client ID** and **Client Secret**.

**3. Add credentials to your environment**

For local development, add to your `.env`:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

For production on Render, set these in the Render dashboard under **Environment** (see [Deploying to Render](#deploying-to-render)).

> **Note:** After adding or changing a redirect URI in Google Cloud Console, wait up to 10 minutes for the change to propagate before testing.

---

## Deploying to Render

The repository includes a `render.yaml` blueprint that provisions the database and web service in one step.

**1. Push to GitHub**

Make sure your code is pushed to a GitHub repository.

**2. Create a new Render Blueprint**

1. Log in to [https://render.com](https://render.com).
2. Go to **New → Blueprint** and connect your GitHub repository.
3. Render will detect `render.yaml` and provision:
   - A **PostgreSQL** managed database (`secrets-db`)
   - A **Node.js web service** (`secrets-app`)

**3. Set secret environment variables**

After the blueprint deploys, two variables require manual values because they cannot be committed to the repository. Go to **Dashboard → secrets-app → Environment** and add:

| Key | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | From your Google Cloud credentials |
| `GOOGLE_CLIENT_SECRET` | From your Google Cloud credentials |

Then click **Save Changes** — Render will redeploy automatically.

**4. Confirm the OAuth callback URL**

The `render.yaml` sets `GOOGLE_CALLBACK_URL` to `https://secrets-app-c07z.onrender.com/auth/google/secrets`. If your Render service URL is different, update this value in **Environment** to match your actual URL, and ensure the same URL is listed in your Google Cloud Console redirect URIs.

**5. Seed the database**

The build command (`npm ci && node db/seed.js`) runs the seed automatically on first deploy. Once the deploy completes, sign in with `demo@secrets.app` / `password123` to verify everything is working.

**Subsequent deploys** happen automatically on every push to `main` (`autoDeploy: true`). The seed script detects existing data and skips silently.

---

## Features

### Identity

Every user is assigned a **weekly rotating codename** — a deterministic `Adjective Noun` pair generated from their user ID and the current ISO week number. 200 adjectives and 200 nouns combine for 40,000 possible codenames. Codenames rotate simultaneously for all users at the start of each ISO week.

Avatars are a single flat colour chosen deterministically from a 12-colour Google palette. No uploads required.

Users can optionally add a display name and bio. Anonymity is the default.

### Layout

On screens 1024px and wider the app renders a three-column layout:

| Column | Content |
|---|---|
| Left (80px) | Navigation rail |
| Centre (flexible) | Page content, capped at 720px and centred |
| Right (340–420px) | Pulse discovery sidebar |

On phones and tablets, the navigation rail is replaced by a bottom navigation bar and the Pulse panel is accessible as a slide-in drawer via the sparkle icon in the top app bar.

### Navigation rail

Seven destinations on desktop, shown as icon + label:

| Icon | Label | Route |
|---|---|---|
| `home` | Feed | `/feed` |
| `group` | Friends | `/friends` |
| `groups` | Groups | `/groups` |
| `notifications` | Alerts | `/notifications` |
| `bookmark` | Saved | `/bookmarks` |
| `dashboard` | Wall | `/confession-wall` |
| `account_circle` | Profile | `/profile` |

### Feed

| Tab | Description |
|---|---|
| All | Chronological feed of all public posts |
| Trending | Ranked by reactions using Hacker News–style time decay: `reactions / (hours + 2)^1.5` |
| Friends | Posts from accepted friends only |

Category filter chips at the top of the All tab narrow the feed by: General, Confession, Question, Story, Advice, Vent, Joy.

### Posts

- Unlimited posts per user — each is a separate entry in the feed
- **Whisper mode** — a post that fades in opacity as views are consumed, disappearing permanently after 10 views
- **Reply chains** — reply to any post; thread view shows the chain with indented cards
- **Hashtags** — typing `#word` in a post body automatically creates a tag. Tags are clickable links that open a filtered feed. Trending hashtags appear in the Pulse sidebar on desktop.
- **Category** — each post is tagged at creation: General, Confession, Question, Story, Advice, Vent, or Joy

### Bookmarks

Any post can be bookmarked using the bookmark icon in the post card header. Saved posts are accessible at `/bookmarks`.

### Search

A search bar in the top app bar opens `/search`, which returns matching posts, users, and hashtags simultaneously.

### Social

- Friend requests with pending, accepted, and declined states
- User search by display name or email
- Public user profiles showing post history, stats, and earned badges
- **Groups** — public or private circles with group-scoped feeds
- **Block** — block any user to remove their posts from your feed
- **Report** — flag a post for review

### Engagement

- Reactions via AJAX — no page reload
- Anonymous comments per post via AJAX
- Notifications for reactions, comments, friend requests, and group events. Badge count in the navigation rail updates in real time and clears on visit.

### Pulse Sidebar

On screens 1024px and wider, a persistent right-hand panel shows the following widgets in order:

| Widget | Description |
|---|---|
| **Today's prompt** | A daily writing prompt with a one-click link to the composer |
| **Your day** | Your post, reaction, and comment counts for the past 24 hours |
| **On this day** | A post from this calendar day in a previous year, from you or a friend (shown only when a match exists) |
| **Online now** | Friends seen in the last 5 minutes |
| **Trending** | Top hashtags from the past 7 days |
| **Suggested** | Users you are not yet friends with |
| **Activity** | Recent posts and reactions from friends |

On phones and tablets, the Pulse panel is accessible via the sparkle button (`auto_awesome`) in the top app bar. It slides in as a drawer from the right edge. Tap the backdrop or the close button to dismiss.

### Draft persistence

The post composer automatically saves a draft to `localStorage` as you type. Returning to the form restores the draft. Submitting clears it.

### Confession Wall

A full-screen drag-and-drop board where any post becomes a sticky note. Notes retain their position on refresh via `localStorage`. SVG lines connect reply chains visually. Accessible from the Wall item in the navigation rail.

### Achievements

Badges awarded automatically based on activity: First Whisper, Night Owl, Storyteller, Heart of Gold, Social Butterfly, Community Builder, and others. Visible on your profile.

### Theme

Light and dark modes, toggled via the button in the top app bar. The preference persists to `localStorage`. The system's `prefers-color-scheme` is respected on the first visit. A sync script in `<head>` prevents any flash before the page renders. Colour transitions animate only during the theme swap, not on every interaction.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Server | Node.js + Express 4 |
| Templates | EJS |
| Auth | Passport.js — local strategy + Google OAuth2 |
| Database | PostgreSQL with `pg` connection pool |
| Passwords | bcrypt, 10 salt rounds |
| Sessions | express-session |
| UI components | @material/web v2 via CDN (no build step) |
| Icons | Material Symbols Rounded via Google Fonts |
| Typography | Google Sans + Google Sans Display |

---

## Project Structure

```
Secrets-App/
├── index.js                     # Bootstrap — middleware, router mounts, graceful shutdown
├── package.json
├── render.yaml                  # Render deployment configuration
│
├── db/
│   ├── index.js                 # pg connection pool, exported as `pool`
│   ├── schema.sql               # All DDL, idempotent (CREATE TABLE IF NOT EXISTS)
│   ├── seed.js                  # Demo data — 8 users, posts, groups, reactions, achievements
│   ├── users.js                 # User lookup, creation, profile update
│   ├── posts.js                 # Post CRUD, feed queries, hashtag extraction
│   ├── friends.js               # Friend request, accept, decline, block queries
│   ├── groups.js                # Group creation, membership, feed queries
│   ├── reactions.js             # Reaction toggle and bulk lookup
│   ├── comments.js              # Comment creation and list
│   ├── bookmarks.js             # Bookmark toggle and list
│   ├── notifications.js         # Notification creation, list, mark-read
│   ├── reports.js               # Post report creation
│   ├── achievements.js          # Achievement check and award
│   ├── pulse.js                 # Pulse sidebar queries: trending hashtags, suggestions,
│   │                            #   friend activity, day stats, online friends, on this day
│   ├── codenames.js             # Weekly rotating codename + deterministic avatar colour
│   └── prompts.js               # Daily writing prompt (deterministic by date)
│
├── routes/
│   ├── pages.js                 # GET /  (landing page, redirects if authenticated)
│   ├── auth.js                  # GET/POST /login  /register  /logout  /auth/google
│   ├── feed.js                  # GET /feed  /feed/trending  /feed/friends
│   ├── posts.js                 # GET /submit  POST /post/create  GET /post/:id
│   ├── profile.js               # GET/POST /profile  /profile/edit  GET /user/:id
│   ├── friends.js               # GET /friends  /friends/search
│   │                            # POST /friends/request|accept|decline|block|unblock
│   ├── groups.js                # GET/POST /groups  /groups/create
│   │                            # GET /groups/:id  POST /groups/:id/join|leave
│   ├── bookmarks.js             # GET /bookmarks
│   ├── search.js                # GET /search
│   ├── hashtag.js               # GET /hashtag/:tag
│   ├── notifications.js         # GET /notifications
│   ├── wall.js                  # GET /confession-wall
│   └── api.js                   # POST /api/post/:id/react|comment|bookmark|report|delete
│                                # GET  /api/post/:id/comments
│
├── middleware/
│   └── auth.js                  # ensureAuthenticated · attachUnreadCount · attachPulse
│
├── views/
│   ├── partials/
│   │   ├── header.ejs           # HTML head, theme sync script, Material Web import, top app bar
│   │   ├── footer.ejs           # Closes app-shell div, pulse sidebar include, scripts, snackbar
│   │   ├── nav.ejs              # Desktop navigation rail (Feed, Friends, Groups, Alerts,
│   │   │                        #   Saved, Wall, Profile)
│   │   ├── bottom-nav.ejs       # Mobile bottom navigation bar (Feed, Friends, Post, Alerts, Saved)
│   │   ├── post-card.ejs        # Reusable post card with reactions, comments, bookmark, report
│   │   └── pulse-sidebar.ejs    # Pulse panel (desktop static column + mobile slide-in drawer)
│   │
│   ├── home.ejs                 # Landing page for unauthenticated visitors
│   ├── login.ejs                # Sign in (email/password + Google OAuth)
│   ├── register.ejs             # Create account (email/password + Google OAuth)
│   ├── error.ejs                # Generic error page
│   ├── feed.ejs                 # Main feed with All / Trending / Friends tabs and category chips
│   ├── submit.ejs               # Post composer — category, whisper toggle, draft persistence
│   ├── post-view.ejs            # Single post with indented reply chain
│   ├── bookmarks.ejs            # Saved posts
│   ├── search.ejs               # Search results across posts, users, and hashtags
│   ├── hashtag.ejs              # Posts filtered by a single hashtag
│   ├── profile.ejs              # User profile — stats, badges, post history
│   ├── profile-edit.ejs         # Edit display name and bio
│   ├── friends.ejs              # Friends list, incoming/outgoing requests, user search
│   ├── groups.ejs               # Group directory
│   ├── group-create.ejs         # Create group form
│   ├── group-detail.ejs         # Group feed and member list
│   ├── notifications.ejs        # Notification list (marked read on visit)
│   └── confession-wall.ejs      # Full-screen drag-and-drop sticky-note board
│
└── public/
    ├── assets/
    │   └── icons/
    │       └── favicon.png      # App icon — used as logo in top bar and auth pages
    ├── css/
    │   ├── styles.css           # Entry point — @import all partials in cascade order
    │   ├── tokens.css           # MD3 colour, shape, typography, elevation, motion tokens
    │   │                        #   for both light and dark themes
    │   ├── base.css             # Box-sizing reset, body, headings, links, Material Symbols,
    │   │                        #   scrollbar, fade-in animation
    │   ├── layouts.css          # Flex-row app-shell (3-column desktop, single-column mobile),
    │   │                        #   top app bar, search bar, navigation rail, bottom nav,
    │   │                        #   auth container, hero section
    │   ├── components.css       # Post card, avatar, badges, reaction buttons, comment form,
    │   │                        #   pulse sidebar (desktop column + mobile drawer), snackbar,
    │   │                        #   message banners
    │   └── pages.css            # Feed, submit, profile, friends, groups, notifications,
    │                            #   bookmarks, search, hashtag, wall — plus responsive
    │                            #   breakpoints (480 / 600 / 768 / 1024 / 1440px)
    └── js/
        ├── app.js               # Reactions, comments, bookmarks, delete, report,
        │                        #   pulse drawer open/close, timestamp formatting
        ├── theme.js             # Light/dark toggle — reads localStorage, syncs icon,
        │                        #   gates colour transition to the 250ms swap window
        └── wall.js              # Confession wall drag-and-drop, SVG chain lines,
                                 #   position persistence via localStorage
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `users` | Accounts — email, hashed password, display name, bio, avatar seed, last seen timestamp |
| `posts` | All posts — content, category, whisper state, view count, parent post for chains, group association |
| `post_hashtags` | Extracted hashtag index for fast tag queries |
| `friendships` | Relationships — pending, accepted, or blocked |
| `groups` | Named circles with public/private flag |
| `group_members` | Group membership with member/admin roles |
| `reactions` | One reaction per user per post |
| `comments` | Anonymous comments on posts |
| `bookmarks` | Saved posts per user |
| `notifications` | Per-user event log (reaction, comment, friend request, group) |
| `reports` | Flagged posts — stored for review |
| `achievements` | Achievement catalogue (key, name, description, icon) |
| `user_achievements` | Earned achievements per user with timestamp |

All tables use `CREATE TABLE IF NOT EXISTS`. Column additions to `users` run via idempotent `DO` blocks. The schema file can be run multiple times without side effects.

---

## API Reference

### Page routes

| Method | Path | Description |
|---|---|---|
| GET | `/` | Landing page (redirects to `/feed` if authenticated) |
| GET/POST | `/login` | Sign in with email and password or Google OAuth |
| GET/POST | `/register` | Create a new account |
| GET | `/logout` | End session |
| GET | `/auth/google` | Start Google OAuth flow |
| GET | `/feed` | Main feed. Optional `?category=` filter. |
| GET | `/feed/trending` | Trending posts |
| GET | `/feed/friends` | Posts from friends |
| GET | `/submit` | Post composer. Optional `?reply=:id` and `?prompt=:text`. |
| POST | `/post/create` | Submit a post |
| GET | `/post/:id` | Single post with reply chain |
| GET | `/bookmarks` | Saved posts |
| GET | `/search` | Search posts, users, and hashtags via `?q=` |
| GET | `/hashtag/:tag` | All posts with a given hashtag |
| GET | `/profile` | Your profile |
| GET/POST | `/profile/edit` | Edit display name and bio |
| GET | `/user/:id` | Another user's public profile |
| GET | `/friends` | Friends list and pending requests |
| GET | `/friends/search` | Search users by name or email |
| POST | `/friends/request/:userId` | Send a friend request |
| POST | `/friends/accept/:friendshipId` | Accept a request |
| POST | `/friends/decline/:friendshipId` | Decline or cancel a request |
| POST | `/friends/block/:userId` | Block a user |
| POST | `/friends/unblock/:userId` | Unblock a user |
| GET | `/groups` | Browse groups |
| GET/POST | `/groups/create` | Create a group |
| GET | `/groups/:id` | Group feed and members |
| POST | `/groups/:id/join` | Join a group |
| POST | `/groups/:id/leave` | Leave a group |
| GET | `/notifications` | Notification list (marks all read on visit) |
| GET | `/confession-wall` | Drag-and-drop sticky-note board |

### JSON endpoints

All JSON endpoints require authentication and accept/return `application/json`.

| Method | Path | Request body | Response |
|---|---|---|---|
| POST | `/api/post/:id/react` | `{ type: "like" }` | `{ active, type, count }` |
| GET | `/api/post/:id/comments` | — | `{ comments: [...] }` |
| POST | `/api/post/:id/comment` | `{ content }` | `{ comment: {...} }` |
| POST | `/api/post/:id/bookmark` | — | `{ bookmarked: boolean }` |
| POST | `/api/post/:id/report` | `{ reason }` | `{ ok: true }` |
| POST | `/api/post/:id/delete` | — | `{ ok: boolean }` |
