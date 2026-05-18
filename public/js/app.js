// Secrets App — client-side logic for reactions, comments, delete, etc.

document.addEventListener('DOMContentLoaded', () => {
  initRipples();
  initReactions();
  initComments();
  initDeleteButtons();
  initBookmarks();
  initReportButtons();
  initTimestamps();
  initPulseDrawer();
});

// ============================================================
// Ripple (for non-MD elements with .ripple class)
// ============================================================
function initRipples() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('.ripple');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

// ============================================================
// Reactions
// ============================================================
function initReactions() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.reaction-btn');
    if (!btn || btn.classList.contains('comment-toggle') || btn.tagName === 'A') return;

    const postId = btn.dataset.postId;
    if (!postId) return;
    const type = btn.dataset.type || 'like';

    btn.disabled = true;
    try {
      const res = await fetch(`/api/post/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      btn.classList.toggle('active', !!data.active);
      const countEl = btn.querySelector('.count');
      if (countEl && typeof data.count === 'number') countEl.textContent = data.count;
    } catch (err) {
      console.error('Reaction error:', err);
      showSnackbar('Could not react');
    } finally {
      btn.disabled = false;
    }
  });
}

// ============================================================
// Comments
// ============================================================
function initComments() {
  // Toggle comment section
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.comment-toggle');
    if (!btn) return;
    const postId = btn.dataset.postId;
    const section = document.getElementById(`comments-${postId}`);
    if (!section) return;

    section.classList.toggle('hidden');
    if (!section.classList.contains('hidden') && !section.dataset.loaded) {
      loadComments(postId, section);
    }
  });

  // Submit comments (delegated)
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('.comment-form');
    if (!form) return;
    e.preventDefault();
    const postId = form.dataset.postId;
    const input = form.querySelector('.comment-input');
    const content = (input && input.value || '').trim();
    if (!content) return;

    try {
      const res = await fetch(`/api/post/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      if (input) input.value = '';
      const list = document.querySelector(`#comments-${postId} .comment-list`);
      if (list && data.comment) list.appendChild(createCommentElement(data.comment));

      const countEl = document.querySelector(`.comment-toggle[data-post-id="${postId}"] .count`);
      if (countEl) countEl.textContent = (parseInt(countEl.textContent || '0', 10) + 1);
      showSnackbar('Comment posted');
    } catch (err) {
      console.error(err);
      showSnackbar('Could not post comment');
    }
  });
}

async function loadComments(postId, section) {
  try {
    const res = await fetch(`/api/post/${postId}/comments`);
    const data = await res.json();
    const list = section.querySelector('.comment-list');
    if (!list) return;
    list.innerHTML = '';
    (data.comments || []).forEach(c => list.appendChild(createCommentElement(c)));
    section.dataset.loaded = 'true';
  } catch (err) {
    console.error('Load comments error:', err);
  }
}

function createCommentElement(c) {
  const div = document.createElement('div');
  div.className = 'comment-item';
  div.innerHTML = `
    <div class="avatar size-32" style="background: ${c.avatar_c1};">
      ${escapeHtml(c.initial || '?')}
    </div>
    <div class="comment-body">
      <div class="comment-author">${escapeHtml(c.codename || 'Anonymous')}</div>
      <div class="comment-text">${escapeHtml(c.content)}</div>
      <div class="comment-time">${timeAgo(c.created_at)}</div>
    </div>
  `;
  return div;
}

// ============================================================
// Delete post buttons
// ============================================================
function initDeleteButtons() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.delete-post-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this secret? This cannot be undone.')) return;
    const postId = btn.dataset.postId;
    try {
      const res = await fetch(`/api/post/${postId}/delete`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
        if (card) {
          card.style.transition = 'opacity .25s, transform .25s';
          card.style.opacity = '0';
          card.style.transform = 'scale(.95)';
          setTimeout(() => card.remove(), 250);
        }
        showSnackbar('Secret deleted');
      } else {
        showSnackbar('Could not delete');
      }
    } catch (err) {
      showSnackbar('Could not delete');
    }
  });
}

// ============================================================
// Timestamps — convert ISO to relative
// ============================================================
function initTimestamps() {
  document.querySelectorAll('[data-timestamp]').forEach(el => {
    const iso = el.getAttribute('data-timestamp');
    if (iso) el.textContent = timeAgo(iso);
  });
}

// ============================================================
// Snackbar
// ============================================================
function showSnackbar(message, duration = 3000) {
  let sb = document.getElementById('snackbar');
  if (!sb) {
    sb = document.createElement('div');
    sb.id = 'snackbar';
    sb.className = 'snackbar';
    document.body.appendChild(sb);
  }
  sb.textContent = message;
  sb.classList.add('show');
  clearTimeout(showSnackbar._t);
  showSnackbar._t = setTimeout(() => sb.classList.remove('show'), duration);
}

// ============================================================
// Utilities
// ============================================================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 30) return 'just now';
  if (seconds < 60) return seconds + 's ago';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
  return new Date(dateStr).toLocaleDateString();
}

// ============================================================
// Bookmarks
// ============================================================
function initBookmarks() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.bookmark-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const postId = btn.dataset.postId;
    if (!postId) return;

    btn.disabled = true;
    try {
      const res = await fetch(`/api/post/${postId}/bookmark`, { method: 'POST' });
      const data = await res.json();
      btn.dataset.active = data.bookmarked ? 'true' : 'false';
      const icon = btn.querySelector('.material-symbols-rounded');
      if (icon) icon.textContent = data.bookmarked ? 'bookmark' : 'bookmark_border';
      showSnackbar(data.bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks');
    } catch (err) {
      showSnackbar('Could not update bookmark');
    } finally {
      btn.disabled = false;
    }
  });
}

// ============================================================
// Report post
// ============================================================
function initReportButtons() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.report-post-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const postId = btn.dataset.postId;
    if (!postId) return;

    const reason = prompt('Report reason:\n1. Spam\n2. Harassment\n3. Inappropriate\n4. Other\n\nType the reason:');
    if (!reason) return;

    try {
      await fetch(`/api/post/${postId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      showSnackbar('Report submitted. Thank you.');
    } catch (err) {
      showSnackbar('Could not send report');
    }
  });
}

// ============================================================
// Pulse drawer (mobile/tablet)
// ============================================================
function initPulseDrawer() {
  const openBtn = document.querySelector('.pulse-toggle-btn');
  const closeBtn = document.querySelector('.pulse-close-btn');
  const backdrop = document.getElementById('pulseBackdrop');

  function openPulse() { document.body.classList.add('pulse-open'); }
  function closePulse() { document.body.classList.remove('pulse-open'); }

  if (openBtn) openBtn.addEventListener('click', openPulse);
  if (closeBtn) closeBtn.addEventListener('click', closePulse);
  if (backdrop) backdrop.addEventListener('click', closePulse);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('pulse-open')) closePulse();
  });
}

window.showSnackbar = showSnackbar;
