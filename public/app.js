// public/app.js
// The dining room talks to the kitchen through the waiter (HTTP + fetch).
// Full URL so the page works however it is opened
// (http://localhost:3000/app, VS Code Live Server, or double-clicking index.html).

const API_URL = 'http://localhost:3000/tasks';

const $ = (id) => document.getElementById(id);
const message = $('message');
const tooltip = $('tooltip');

let tasks = [];
let currentFilter = 'all';
let searchText = '';

// ---------------------------------------------------------------- API helper

// Send a request and turn error responses into thrown errors
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  // 204 No Content has no body to parse
  if (res.status === 204) return null;

  // An HTML page instead of JSON means the request hit the wrong server
  const type = res.headers.get('Content-Type') || '';
  if (!type.includes('application/json')) {
    throw new Error(`${url} did not return JSON. Is the API running on port 3000?`);
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function showError(text) {
  message.textContent = text;
  message.hidden = false;
}

function clearError() {
  message.hidden = true;
}

function setApiStatus(online) {
  $('api-status').className = `api-status ${online ? 'online' : 'offline'}`;
  $('api-status-text').textContent = online ? 'API connected' : 'API offline';
}

// ---------------------------------------------------------------- helpers

// MySQL returns completed as 0/1, the in-memory API returns true/false
function isDone(task) {
  return Boolean(task.completed);
}

function createdDate(task) {
  return task.created_at ? new Date(task.created_at) : null;
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatShort(date) {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

// Newest first: by created_at when the API sends it, otherwise by id
function newestFirst(a, b) {
  const da = createdDate(a);
  const db = createdDate(b);
  if (da && db && da.getTime() !== db.getTime()) return db - da;
  return b.id - a.id;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function showTooltip(event, title, rows) {
  tooltip.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'tt-title';
  head.textContent = title;
  tooltip.appendChild(head);

  rows.forEach(({ color, text }) => {
    const row = document.createElement('div');
    row.className = 'tt-row';
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = color;
    const label = document.createElement('span');
    label.textContent = text;
    row.append(swatch, label);
    tooltip.appendChild(row);
  });

  tooltip.hidden = false;
  const pad = 14;
  const box = tooltip.getBoundingClientRect();
  let x = event.clientX + pad;
  let y = event.clientY + pad;
  if (x + box.width > window.innerWidth - 8) x = event.clientX - box.width - pad;
  if (y + box.height > window.innerHeight - 8) y = event.clientY - box.height - pad;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function hideTooltip() {
  tooltip.hidden = true;
}

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ---------------------------------------------------------------- rendering

function render() {
  const total = tasks.length;
  const done = tasks.filter(isDone).length;
  const active = total - done;
  const rate = total ? Math.round((done / total) * 100) : 0;

  // Hero
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  $('hero-greeting').textContent = `${greeting}!`;
  $('hero-date').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  $('hero-summary').textContent = total === 0
    ? 'No tasks yet. Add one to get started.'
    : active === 0
      ? `All ${total} tasks are done. Nice work!`
      : `You have ${active} task${active === 1 ? '' : 's'} left out of ${total}.`;

  // Stat tiles
  $('stat-total').textContent = total;
  $('stat-done').textContent = done;
  $('stat-active').textContent = active;
  $('stat-rate').textContent = `${rate}%`;
  $('nav-count').textContent = total;

  renderDonut(done, active);
  renderBarChart();
  renderRecent();
  renderAllTasks();
}

function renderDonut(done, active) {
  const svg = $('donut');
  svg.innerHTML = '';
  const total = done + active;
  const r = 56;
  const c = 2 * Math.PI * r;
  const center = 70;

  svg.appendChild(svgEl('circle', { class: 'track', cx: center, cy: center, r, 'stroke-width': 14, fill: 'none' }));

  const segments = [
    { value: done, color: cssVar('--series-aqua'), label: 'Completed' },
    { value: active, color: cssVar('--series-blue'), label: 'To do' },
  ].filter((s) => s.value > 0);

  // 2px surface gap between the two segments (only when both exist)
  const gap = segments.length > 1 ? 3 : 0;
  let offset = 0;
  segments.forEach((seg) => {
    const length = (seg.value / total) * c;
    const circle = svgEl('circle', {
      class: 'seg',
      cx: center,
      cy: center,
      r,
      fill: 'none',
      stroke: seg.color,
      'stroke-width': 14,
      'stroke-dasharray': `${Math.max(length - gap, 0.01)} ${c}`,
      'stroke-dashoffset': -offset,
      transform: `rotate(-90 ${center} ${center})`,
    });
    const pct = Math.round((seg.value / total) * 100);
    circle.addEventListener('mousemove', (e) =>
      showTooltip(e, seg.label, [{ color: seg.color, text: `${seg.value} task${seg.value === 1 ? '' : 's'} · ${pct}%` }]));
    circle.addEventListener('mouseleave', hideTooltip);
    svg.appendChild(circle);
    offset += length;
  });

  $('donut-pct').textContent = `${total ? Math.round((done / total) * 100) : 0}%`;
  $('legend-done').textContent = done;
  $('legend-active').textContent = active;
}

function renderBarChart() {
  const svg = $('bar-chart');
  svg.innerHTML = '';
  svg.classList.remove('hovering');

  // Last 7 days, oldest on the left
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({ date: d, key: dayKey(d), count: 0 });
  }
  const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
  const dated = tasks.filter((t) => createdDate(t));
  dated.forEach((t) => {
    const day = byKey[dayKey(createdDate(t))];
    if (day) day.count += 1;
  });

  // Table view (same data, for screen readers and exact numbers)
  const tbody = $('chart-table');
  tbody.innerHTML = '';
  days.forEach((d) => {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    td1.textContent = d.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    const td2 = document.createElement('td');
    td2.textContent = d.count;
    tr.append(td1, td2);
    tbody.appendChild(tr);
  });

  // The in-memory API has no created_at, so there is nothing to chart
  const note = $('chart-note');
  if (tasks.length > 0 && dated.length === 0) {
    note.textContent = 'Dates are only available with the MySQL version (npm run start:mvc).';
    note.hidden = false;
    return;
  }
  note.hidden = true;

  const W = 420;
  const H = 200;
  const left = 32;
  const right = 8;
  const top = 20;
  const bottom = 28;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const maxCount = Math.max(...days.map((d) => d.count));
  const yMax = Math.max(2, maxCount % 2 === 0 ? maxCount : maxCount + 1);

  // Recessive grid: 0, half, max
  [0, yMax / 2, yMax].forEach((v) => {
    const y = top + plotH - (v / yMax) * plotH;
    svg.appendChild(svgEl('line', { class: 'grid-line', x1: left, x2: W - right, y1: y, y2: y }));
    const label = svgEl('text', { class: 'axis-label', x: left - 8, y: y + 4, 'text-anchor': 'end' });
    label.textContent = v;
    svg.appendChild(label);
  });

  const slot = plotW / days.length;
  const barW = Math.min(44, slot * 0.6);
  const baseline = top + plotH;
  const blue = cssVar('--series-blue');

  days.forEach((d, i) => {
    const cx = left + slot * i + slot / 2;
    const x = cx - barW / 2;
    const h = (d.count / yMax) * plotH;

    if (h > 0) {
      // Rounded top (4px), square at the baseline
      const rr = Math.min(4, h);
      const y = baseline - h;
      const path = `M${x},${baseline} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + barW - rr} Q${x + barW},${y} ${x + barW},${y + rr} V${baseline} Z`;
      svg.appendChild(svgEl('path', { class: 'bar', d: path, 'data-i': i }));
    }

    // Day label under each bar; "Today" for the last one
    const dayLabel = svgEl('text', { class: 'axis-label', x: cx, y: H - 8, 'text-anchor': 'middle' });
    dayLabel.textContent = i === days.length - 1 ? 'Today' : d.date.toLocaleDateString(undefined, { weekday: 'short' });
    svg.appendChild(dayLabel);

    // Direct label only on the busiest day
    if (d.count > 0 && d.count === maxCount) {
      const value = svgEl('text', { class: 'bar-value', x: cx, y: baseline - h - 6, 'text-anchor': 'middle' });
      value.textContent = d.count;
      svg.appendChild(value);
    }

    // Hit target: the whole column, bigger than the bar
    const hit = svgEl('rect', { class: 'hit', x: left + slot * i, y: top, width: slot, height: plotH });
    hit.addEventListener('mousemove', (e) => {
      svg.classList.add('hovering');
      svg.querySelectorAll('.bar').forEach((b) => b.classList.toggle('is-active', b.dataset.i === String(i)));
      const title = d.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
      showTooltip(e, title, [{ color: blue, text: `${d.count} task${d.count === 1 ? '' : 's'} added` }]);
    });
    hit.addEventListener('mouseleave', () => {
      svg.classList.remove('hovering');
      hideTooltip();
    });
    svg.appendChild(hit);
  });
}

function renderTask(task) {
  const li = document.createElement('li');
  li.className = isDone(task) ? 'task done' : 'task';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = isDone(task);
  checkbox.setAttribute('aria-label', 'Mark complete');
  checkbox.addEventListener('change', () => updateTask(task, { completed: checkbox.checked }));

  const body = document.createElement('div');
  body.className = 'task-body';

  // textContent (never innerHTML) so a title like <script> is shown as text
  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = task.title;
  title.title = 'Double-click to edit';
  title.addEventListener('dblclick', () => startEdit(body, title, task));

  const meta = document.createElement('span');
  meta.className = 'meta';
  const date = createdDate(task);
  meta.textContent = date ? `Added ${formatShort(date)}` : `Task #${task.id}`;

  body.append(title, meta);

  const pill = document.createElement('span');
  pill.className = isDone(task) ? 'pill pill-done' : 'pill pill-active';
  pill.textContent = isDone(task) ? 'Done' : 'To do';

  const del = document.createElement('button');
  del.className = 'delete';
  del.setAttribute('aria-label', `Delete ${task.title}`);
  del.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
  del.addEventListener('click', () => deleteTask(task));

  li.append(checkbox, body, pill, del);
  return li;
}

function renderRecent() {
  const list = $('recent-list');
  list.innerHTML = '';
  const recent = [...tasks].sort(newestFirst).slice(0, 5);
  recent.forEach((task) => list.appendChild(renderTask(task)));
  $('recent-empty').hidden = recent.length > 0;
}

function renderAllTasks() {
  const list = $('task-list');
  list.innerHTML = '';

  const visible = [...tasks].sort(newestFirst).filter((task) => {
    if (currentFilter === 'active' && isDone(task)) return false;
    if (currentFilter === 'done' && !isDone(task)) return false;
    return task.title.toLowerCase().includes(searchText);
  });

  visible.forEach((task) => list.appendChild(renderTask(task)));
  $('empty').hidden = visible.length > 0;
  $('empty').textContent = tasks.length === 0 ? 'No tasks yet.' : 'No tasks match.';

  const remaining = tasks.filter((t) => !isDone(t)).length;
  $('tasks-count').textContent = `${remaining} of ${tasks.length} left`;
}

function startEdit(body, titleEl, task) {
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'edit-input';
  editInput.value = task.title;
  editInput.maxLength = 255;
  body.replaceChild(editInput, titleEl);
  editInput.focus();
  editInput.select();

  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    const newTitle = editInput.value.trim();
    if (save && newTitle && newTitle !== task.title) {
      updateTask(task, { title: newTitle });
    } else {
      render();
    }
  };

  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  editInput.addEventListener('blur', () => finish(true));
}

// ---------------------------------------------------------------- API calls

// GET /tasks
async function loadTasks() {
  try {
    tasks = await request(API_URL);
    setApiStatus(true);
    clearError();
  } catch (err) {
    setApiStatus(false);
    // fetch throws "Failed to fetch" when nothing is listening on port 3000
    showError(`Could not load tasks: ${err.message}`);
  }
  render();
}

// POST /tasks
async function addTask(title) {
  try {
    const newTask = await request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    tasks.push(newTask);
    setApiStatus(true);
    clearError();
  } catch (err) {
    showError(err.message);
  }
  render();
}

// PATCH /tasks/:id — { completed } or { title }
async function updateTask(task, fields) {
  try {
    const updated = await request(`${API_URL}/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
    tasks = tasks.map((t) => (t.id === updated.id ? updated : t));
    clearError();
  } catch (err) {
    showError(err.message);
  }
  render();
}

// DELETE /tasks/:id
async function deleteTask(task) {
  try {
    await request(`${API_URL}/${task.id}`, { method: 'DELETE' });
    tasks = tasks.filter((t) => t.id !== task.id);
    clearError();
  } catch (err) {
    showError(err.message);
  }
  render();
}

// ---------------------------------------------------------------- events

document.querySelectorAll('.add-form').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    const title = input.value.trim();
    if (!title) {
      showError('Title is required');
      return;
    }
    input.value = '';
    addTask(title);
  });
});

// Sidebar navigation and "View all" link
function showView(name) {
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== `view-${name}`; });
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  window.scrollTo(0, 0);
}
document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => showView(button.dataset.view));
});

document.querySelectorAll('.filter').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach((b) => b.classList.remove('active'));
    button.classList.add('active');
    currentFilter = button.dataset.filter;
    renderAllTasks();
  });
});

$('search').addEventListener('input', (e) => {
  searchText = e.target.value.trim().toLowerCase();
  renderAllTasks();
});

// Light / dark mode, remembered in this browser
function currentTheme() {
  const set = document.documentElement.dataset.theme;
  if (set) return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('theme-label').textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  render(); // charts read colours from CSS, so redraw them
}
try {
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.dataset.theme = saved;
} catch { /* storage blocked — use the system setting */ }
$('theme-label').textContent = currentTheme() === 'dark' ? 'Light mode' : 'Dark mode';

// Colour theme (violet, ocean, sunset, forest, rose), remembered in this browser
function applyAccent(name) {
  if (name === 'violet') delete document.documentElement.dataset.accent;
  else document.documentElement.dataset.accent = name;
  document.querySelectorAll('.swatch-btn').forEach((b) => b.classList.toggle('active', b.dataset.accent === name));
}
let savedAccent = 'violet';
try { savedAccent = localStorage.getItem('accent') || 'violet'; } catch { /* ignore */ }
applyAccent(savedAccent);

document.querySelectorAll('.swatch-btn').forEach((button) => {
  button.addEventListener('click', () => {
    try { localStorage.setItem('accent', button.dataset.accent); } catch { /* ignore */ }
    applyAccent(button.dataset.accent);
  });
});

$('theme-toggle').addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('theme', next); } catch { /* ignore */ }
  applyTheme(next);
});

loadTasks();
