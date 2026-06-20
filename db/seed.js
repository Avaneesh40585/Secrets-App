/**
 * Seed script — populates the database with demo data so every feature
 * of the app is visible immediately after setup.
 *
 * Run once:  node db/seed.js
 * Safe to re-run: exits early if seed users already exist.
 *
 * Demo password for every account: password123
 */

import bcrypt from 'bcrypt';
import { pool, initializeDatabase } from './index.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function yearsAgo(n) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString();
}

function hoursAgo(n) {
  return new Date(Date.now() - n * 3600_000).toISOString();
}

function extractHashtags(text) {
  return [...new Set([...text.matchAll(/#([a-zA-Z0-9_]{1,40})/g)].map(m => m[1].toLowerCase()))];
}

async function insertHashtags(client, postId, content) {
  const tags = extractHashtags(content);
  for (const tag of tags) {
    await client.query(
      `INSERT INTO post_hashtags (post_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [postId, tag]
    );
  }
}

// ─── main ────────────────────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();

  await initializeDatabase();

  try {
    // Guard: exit if demo data already exists
    const { rows: existing } = await client.query(
      `SELECT 1 FROM users WHERE email = 'demo@secrets.app' LIMIT 1`
    );
    if (existing.length > 0) {
      console.log('[seed] Demo data already present — skipping.');
      return;
    }

    await client.query('BEGIN');

    // ── 1. Users ────────────────────────────────────────────────────────────
    const pw = await bcrypt.hash('password123', 10);

    const users = [
      { email: 'demo@secrets.app',    name: 'Demo User',      bio: 'The official demo account. Password: password123' },
      { email: 'luna@secrets.app',    name: 'Luna Carter',    bio: 'Night owl. Writes between midnight and dawn.' },
      { email: 'marcus@secrets.app',  name: 'Marcus Obi',     bio: 'Storyteller. Shares one secret every morning.' },
      { email: 'priya@secrets.app',   name: 'Priya Nair',     bio: 'Curious about everything. Asks too many questions.' },
      { email: 'eli@secrets.app',     name: 'Eli Voss',       bio: 'Prefers anonymity. Rarely uses a display name.' },
      { email: 'sofia@secrets.app',   name: 'Sofia Reyes',    bio: 'Community organiser. Created The Confessional group.' },
      { email: 'tom@secrets.app',     name: 'Tom Blake',      bio: 'Lurker turned poster. New here.' },
      { email: 'zara@secrets.app',    name: 'Zara Osei',      bio: 'Poet. Every post is a draft of something longer.' },
    ];

    const userIds = [];
    for (const u of users) {
      const avatarSeed = Buffer.from(u.email).toString('hex').slice(0, 16);
      const { rows } = await client.query(
        `INSERT INTO users (email, password, display_name, bio, avatar_seed, created_at, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [u.email, pw, u.name, u.bio, avatarSeed]
      );
      userIds.push(rows[0].id);
    }

    const [demo, luna, marcus, priya, eli, sofia, tom, zara] = userIds;

    // ── 2. Friendships ──────────────────────────────────────────────────────
    const friendPairs = [
      [demo,   luna,   'accepted'],
      [demo,   marcus, 'accepted'],
      [demo,   priya,  'accepted'],
      [luna,   marcus, 'accepted'],
      [luna,   zara,   'accepted'],
      [marcus, sofia,  'accepted'],
      [priya,  sofia,  'accepted'],
      [eli,    demo,   'pending'],   // pending request to demo
      [tom,    demo,   'pending'],   // another pending request
    ];

    for (const [a, b, status] of friendPairs) {
      await client.query(
        `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [a, b, status]
      );
    }

    // ── 3. Groups ───────────────────────────────────────────────────────────
    const { rows: [g1] } = await client.query(
      `INSERT INTO groups (name, description, creator_id, is_private)
       VALUES ('Late Night Thoughts', 'A space for the things you only think about after midnight. Public.', $1, false)
       RETURNING id`,
      [luna]
    );
    const { rows: [g2] } = await client.query(
      `INSERT INTO groups (name, description, creator_id, is_private)
       VALUES ('The Confessional', 'Private circle for deeper confessions. Request to join.', $1, true)
       RETURNING id`,
      [sofia]
    );

    const groupMembers = [
      [g1.id, luna,   'admin'],
      [g1.id, demo,   'member'],
      [g1.id, marcus, 'member'],
      [g1.id, zara,   'member'],
      [g2.id, sofia,  'admin'],
      [g2.id, priya,  'member'],
      [g2.id, marcus, 'member'],
    ];
    for (const [gid, uid, role] of groupMembers) {
      await client.query(
        `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [gid, uid, role]
      );
    }

    // ── 4. Posts ─────────────────────────────────────────────────────────────
    async function post(client, { userId, content, category = 'general', isWhisper = false,
                                   whisperViews = null, parentId = null, groupId = null, createdAt = null }) {
      const ts = createdAt || new Date().toISOString();
      const { rows } = await client.query(
        `INSERT INTO posts (user_id, content, category, is_whisper, whisper_views_remaining,
                            parent_post_id, group_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
         RETURNING id`,
        [userId, content, category, isWhisper, whisperViews, parentId, groupId, ts]
      );
      const id = rows[0].id;
      await insertHashtags(client, id, content);
      return id;
    }

    // General feed
    const p1 = await post(client, {
      userId: luna, category: 'confession', createdAt: hoursAgo(2),
      content: "I told everyone I quit social media for my mental health. The truth is I just got tired of performing happiness. #confession #mentalhealth",
    });
    const p2 = await post(client, {
      userId: marcus, category: 'story', createdAt: hoursAgo(5),
      content: "Three years ago I nearly dropped out of university. I didn't tell a soul. Last week I walked across the stage at graduation. Some battles you fight alone. #story #growth",
    });
    const p3 = await post(client, {
      userId: priya, category: 'question', createdAt: hoursAgo(8),
      content: "Does anyone else rehearse conversations in their head that never actually happen? Asking for a friend. #question #anxiety",
    });
    const p4 = await post(client, {
      userId: sofia, category: 'advice', createdAt: hoursAgo(12),
      content: "Unsolicited advice that changed my life: stop explaining yourself to people who are determined to misunderstand you. #advice #boundaries",
    });
    const p5 = await post(client, {
      userId: zara, category: 'joy', createdAt: hoursAgo(14),
      content: "A stranger held the elevator for me today even though it was clearly inconvenient. I almost cried. Kindness still exists. #joy #grateful",
    });
    const p6 = await post(client, {
      userId: tom, category: 'vent', createdAt: hoursAgo(18),
      content: "I've rewritten this post four times. Some things are hard to put into words even when you're anonymous. #vent",
    });
    const p7 = await post(client, {
      userId: eli, category: 'confession', createdAt: hoursAgo(22),
      content: "I still have the first letter someone ever wrote me. I've moved six times. It's always the first thing I pack. #confession #nostalgia",
    });
    const p8 = await post(client, {
      userId: demo, category: 'general', createdAt: daysAgo(1),
      content: "If you're reading this: you made it through every hard day so far. That's a 100% success rate. #mindfulness",
    });
    const p9 = await post(client, {
      userId: marcus, category: 'story', createdAt: daysAgo(1),
      content: "My grandmother kept a journal for 40 years. She never showed anyone. When she passed we found 23 notebooks. We didn't read them — we buried them with her. Some secrets deserve to stay secret. #story #family",
    });
    const p10 = await post(client, {
      userId: luna, category: 'question', createdAt: daysAgo(2),
      content: "At what point does a habit become part of your identity? I've been #writing every night for two years and I still don't call myself a writer.",
    });

    // Whisper posts
    const pw1 = await post(client, {
      userId: priya, category: 'confession', isWhisper: true, whisperViews: 7,
      createdAt: hoursAgo(3),
      content: "I got the job offer I've been waiting two years for. I haven't told anyone yet because I'm scared saying it out loud will jinx it.",
    });
    const pw2 = await post(client, {
      userId: zara, category: 'general', isWhisper: true, whisperViews: 10,
      createdAt: hoursAgo(6),
      content: "This disappears after 10 views. Whisper mode means even the platform forgets you said it. There's something freeing about that.",
    });

    // Reply chains
    const reply1 = await post(client, {
      userId: demo, category: 'general', parentId: p3, createdAt: hoursAgo(7),
      content: "Every single night. I've had entire arguments with people in my head that they'll never know about.",
    });
    const reply2 = await post(client, {
      userId: luna, category: 'general', parentId: p3, createdAt: hoursAgo(6),
      content: "I've resolved conflicts that haven't happened yet. It's exhausting being this prepared.",
    });
    const reply3 = await post(client, {
      userId: marcus, category: 'general', parentId: reply1, createdAt: hoursAgo(5),
      content: "The worst part is when the real conversation goes completely differently and none of your rehearsed lines fit.",
    });

    // Group posts
    const gp1 = await post(client, {
      userId: luna, category: 'general', groupId: g1.id, createdAt: daysAgo(1),
      content: "3am and I can't stop thinking about a conversation from seven years ago. Anyone else haunted by their past self?",
    });
    const gp2 = await post(client, {
      userId: marcus, category: 'confession', groupId: g1.id, createdAt: daysAgo(2),
      content: "I write best between 1am and 4am. I've tried to shift it. It won't move. Night owl by force, not choice.",
    });
    const gp3 = await post(client, {
      userId: sofia, category: 'confession', groupId: g2.id, createdAt: daysAgo(1),
      content: "I created this group because I needed a place that felt smaller than the internet. I hope it helps someone.",
    });

    // "On this day" post — exactly 1 year ago today
    const onThisDay = await post(client, {
      userId: demo, category: 'general', createdAt: yearsAgo(1),
      content: "One year ago I joined this platform not knowing what to expect. I've shared more here than anywhere else. #anniversary #reflection",
    });

    // Older posts to populate trending hashtags
    for (let i = 0; i < 6; i++) {
      await post(client, {
        userId: [luna, marcus, priya, sofia, zara, tom][i],
        category: 'general',
        createdAt: daysAgo(i + 3),
        content: `Another thought about #mindfulness and staying present. Day ${i + 1} of trying.`,
      });
    }

    // ── 5. Reactions ─────────────────────────────────────────────────────────
    const reactionData = [
      [luna,   p2], [luna,   p4], [luna,   p8], [luna,   p9],
      [marcus, p1], [marcus, p5], [marcus, p8],
      [priya,  p2], [priya,  p7], [priya,  p9],
      [demo,   p1], [demo,   p2], [demo,   p4], [demo,   p5], [demo,   p9],
      [sofia,  p3], [sofia,  p6], [sofia,  p7],
      [zara,   p1], [zara,   p8],
      [eli,    p2], [eli,    p5],
      [tom,    p4], [tom,    p9],
    ];
    for (const [uid, pid] of reactionData) {
      await client.query(
        `INSERT INTO reactions (user_id, post_id, type) VALUES ($1, $2, 'like') ON CONFLICT DO NOTHING`,
        [uid, pid]
      );
    }

    // ── 6. Comments ──────────────────────────────────────────────────────────
    const commentData = [
      [luna,   p2,  "This made me tear up. Congratulations — you earned it."],
      [marcus, p1,  "The performance of happiness is exhausting. I recognise this."],
      [priya,  p5,  "This is the kind of thing that restores your faith."],
      [demo,   p9,  "Leaving those notebooks unread was the most respectful thing imaginable."],
      [sofia,  p2,  "Some battles really do shape us more than the ones fought with witnesses."],
      [zara,   p4,  "Saving this. I needed to hear it today."],
      [luna,   p8,  "100% success rate. I'm going to think about this for a while."],
      [tom,    p1,  "The honesty in this hit differently."],
      [eli,    p3,  "I write whole speeches. None of them ever get delivered."],
      [marcus, gp1, "Still haunted by a conversation from 2017. So yes."],
    ];
    for (const [uid, pid, content] of commentData) {
      await client.query(
        `INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3)`,
        [pid, uid, content]
      );
    }

    // ── 7. Bookmarks ─────────────────────────────────────────────────────────
    const bookmarkData = [
      [demo, p4], [demo, p9], [demo, p2],
      [luna, p8], [luna, p2],
      [marcus, p1], [marcus, p5],
      [priya, p4], [priya, p9],
    ];
    for (const [uid, pid] of bookmarkData) {
      await client.query(
        `INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [uid, pid]
      );
    }

    // ── 8. Notifications ─────────────────────────────────────────────────────
    const notifData = [
      [demo, 'reaction',       p8,           'Lunar Root reacted to your secret'],
      [demo, 'reaction',       p8,           'Bold Panther reacted to your secret'],
      [demo, 'comment',        p8,           'Silent Ember commented on your secret'],
      [demo, 'friend_request', null,         'Drifting Fox sent you a friend request'],
      [demo, 'friend_request', null,         'Crimson Wave sent you a friend request'],
      [demo, 'friend_accept',  null,         'Midnight Tide accepted your friend request'],
      [luna, 'reaction',       p1,           'Wandering Stone reacted to your secret'],
      [luna, 'comment',        p1,           'Golden Fern commented on your secret'],
      [marcus, 'reaction',     p2,           'Curious Moon reacted to your secret'],
      [marcus, 'reaction',     p2,           'Velvet Rain reacted to your secret'],
      [marcus, 'reaction',     p2,           'Silver Fox reacted to your secret'],
    ];
    for (const [uid, type, refId, message] of notifData) {
      await client.query(
        `INSERT INTO notifications (user_id, type, reference_id, message, is_read)
         VALUES ($1, $2, $3, $4, false)`,
        [uid, type, refId, message]
      );
    }

    // ── 9. Achievements ──────────────────────────────────────────────────────
    const achievementData = [
      [demo,   'first_post'],
      [demo,   'ten_reactions'],
      [demo,   'first_friend'],
      [demo,   'five_friends'],
      [luna,   'first_post'],
      [luna,   'first_friend'],
      [luna,   'night_owl'],
      [luna,   'whisper_master'],
      [marcus, 'first_post'],
      [marcus, 'ten_posts'],
      [marcus, 'ten_reactions'],
      [marcus, 'first_friend'],
      [priya,  'first_post'],
      [priya,  'whisper_master'],
      [sofia,  'first_post'],
      [sofia,  'first_friend'],
      [sofia,  'first_group'],
      [zara,   'first_post'],
      [zara,   'night_owl'],
    ];
    for (const [uid, key] of achievementData) {
      await client.query(
        `INSERT INTO user_achievements (user_id, achievement_key) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [uid, key]
      );
    }

    await client.query('COMMIT');

    console.log('[seed] Done. Demo accounts created:');
    console.log('');
    console.log('  Email                  Password');
    console.log('  ---------------------  -----------');
    for (const u of users) {
      console.log(`  ${u.email.padEnd(22)} password123`);
    }
    console.log('');
    console.log('[seed] Sign in as demo@secrets.app to see everything.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed] Failed — transaction rolled back.');
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
