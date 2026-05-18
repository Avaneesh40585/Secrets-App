// Confession Wall — drag and drop sticky notes, save layout to localStorage
(function () {
  const board = document.getElementById('wallBoard');
  if (!board) return;

  const LAYOUT_KEY = 'secrets-wall-layout-v1';
  const notes = Array.from(board.querySelectorAll('.sticky-note'));
  const svg = document.getElementById('wallChains');

  function loadLayout() {
    try { return JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}'); }
    catch { return {}; }
  }

  function saveLayout(layout) {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  }

  function placeNote(note, x, y, rotate) {
    note.style.left = x + 'px';
    note.style.top = y + 'px';
    note.style.transform = `rotate(${rotate || -2}deg)`;
    note.style.setProperty('--rotate', (rotate || -2) + 'deg');
  }

  function randomInRange(min, max) { return Math.random() * (max - min) + min; }

  function placeRandom() {
    const boardRect = board.getBoundingClientRect();
    const layout = {};
    notes.forEach((note, i) => {
      const w = 220, h = 200;
      const cols = Math.max(2, Math.floor(boardRect.width / (w + 24)));
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (w + 24) + randomInRange(-8, 24);
      const y = row * (h + 24) + randomInRange(-8, 24);
      const rotate = randomInRange(-5, 5);
      placeNote(note, x, y, rotate);
      layout[note.dataset.postId] = { x, y, rotate };
    });
    saveLayout(layout);
    redrawChains();
  }

  function applyLayout() {
    const saved = loadLayout();
    if (Object.keys(saved).length === 0) {
      placeRandom();
      return;
    }
    notes.forEach((note, i) => {
      const id = note.dataset.postId;
      if (saved[id]) {
        placeNote(note, saved[id].x, saved[id].y, saved[id].rotate);
      } else {
        const w = 220, h = 200;
        const x = randomInRange(0, board.clientWidth - w);
        const y = randomInRange(0, Math.max(200, board.clientHeight - h));
        placeNote(note, x, y, randomInRange(-5, 5));
        saved[id] = { x, y, rotate: -2 };
        saveLayout(saved);
      }
    });
    redrawChains();
  }

  function redrawChains() {
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const layout = loadLayout();
    notes.forEach(note => {
      const parentId = note.dataset.parentId;
      if (!parentId) return;
      const child = layout[note.dataset.postId];
      const parent = layout[parentId];
      if (!child || !parent) return;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', parent.x + 110);
      line.setAttribute('y1', parent.y + 100);
      line.setAttribute('x2', child.x + 110);
      line.setAttribute('y2', child.y + 100);
      line.setAttribute('stroke', 'rgba(139, 92, 246, 0.5)');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-dasharray', '4 4');
      svg.appendChild(line);
    });
  }

  // Drag implementation (mouse + touch)
  let dragging = null;
  let offsetX = 0, offsetY = 0;

  function onDown(e) {
    const note = e.target.closest('.sticky-note');
    if (!note) return;
    dragging = note;
    const rect = note.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    offsetX = point.clientX - rect.left;
    offsetY = point.clientY - rect.top;
    note.style.zIndex = 1000;
    note.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    const point = e.touches ? e.touches[0] : e;
    const boardRect = board.getBoundingClientRect();
    const x = point.clientX - boardRect.left - offsetX;
    const y = point.clientY - boardRect.top - offsetY;
    dragging.style.left = x + 'px';
    dragging.style.top = y + 'px';
  }

  function onUp() {
    if (!dragging) return;
    dragging.style.zIndex = '';
    dragging.style.cursor = 'grab';
    const layout = loadLayout();
    layout[dragging.dataset.postId] = {
      x: parseFloat(dragging.style.left),
      y: parseFloat(dragging.style.top),
      rotate: parseFloat(dragging.style.getPropertyValue('--rotate') || -2),
    };
    saveLayout(layout);
    redrawChains();
    dragging = null;
  }

  board.addEventListener('mousedown', onDown);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  board.addEventListener('touchstart', onDown, { passive: false });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onUp);

  // Disable native drag image so our custom drag works smoothly
  notes.forEach(n => n.addEventListener('dragstart', e => e.preventDefault()));

  document.getElementById('resetLayoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem(LAYOUT_KEY);
    placeRandom();
  });

  applyLayout();
  window.addEventListener('resize', redrawChains);
})();
