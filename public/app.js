// public/app.js
// The dining room talks to the kitchen through the waiter (HTTP + fetch).
// Full URL so the page works however it is opened
// (http://localhost:3000/app, VS Code Live Server, or double-clicking index.html).

const API_URL = 'http://localhost:3000/tasks';

const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const list = document.getElementById('task-list');
const message = document.getElementById('message');
const empty = document.getElementById('empty');
const count = document.getElementById('count');
const filterButtons = document.querySelectorAll('.filter');

let tasks = [];
let currentFilter = 'all';

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

// MySQL returns completed as 0/1, the in-memory API returns true/false
function isDone(task) {
  return Boolean(task.completed);
}

function render() {
  list.innerHTML = '';

  const visible = tasks.filter((task) => {
    if (currentFilter === 'active') return !isDone(task);
    if (currentFilter === 'done') return isDone(task);
    return true;
  });

  visible.forEach((task) => list.appendChild(renderTask(task)));

  empty.hidden = visible.length > 0;
  const remaining = tasks.filter((task) => !isDone(task)).length;
  count.textContent = `${remaining} of ${tasks.length} left`;
}

function renderTask(task) {
  const li = document.createElement('li');
  li.className = isDone(task) ? 'task done' : 'task';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = isDone(task);
  checkbox.title = 'Mark complete';
  checkbox.addEventListener('change', () => toggleTask(task, checkbox.checked));

  // textContent (never innerHTML) so a title like <script> is shown as text
  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = task.title;
  title.title = 'Double-click to edit';
  title.addEventListener('dblclick', () => startEdit(li, title, task));

  const del = document.createElement('button');
  del.className = 'delete';
  del.textContent = 'Delete';
  del.addEventListener('click', () => deleteTask(task));

  li.append(checkbox, title, del);
  return li;
}

function startEdit(li, titleEl, task) {
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'edit-input';
  editInput.value = task.title;
  editInput.maxLength = 255;
  li.replaceChild(editInput, titleEl);
  editInput.focus();

  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    const newTitle = editInput.value.trim();
    if (save && newTitle && newTitle !== task.title) {
      renameTask(task, newTitle);
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

function replaceTask(updated) {
  tasks = tasks.map((task) => (task.id === updated.id ? updated : task));
}

// GET /tasks
async function loadTasks() {
  try {
    tasks = await request(API_URL);
    clearError();
  } catch (err) {
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
    tasks.unshift(newTask);
    clearError();
    render();
  } catch (err) {
    showError(err.message);
  }
}

// PATCH /tasks/:id — completed
async function toggleTask(task, completed) {
  try {
    const updated = await request(`${API_URL}/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    });
    replaceTask(updated);
    clearError();
  } catch (err) {
    showError(err.message);
  }
  render();
}

// PATCH /tasks/:id — title
async function renameTask(task, title) {
  try {
    const updated = await request(`${API_URL}/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
    replaceTask(updated);
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
    tasks = tasks.filter((item) => item.id !== task.id);
    clearError();
  } catch (err) {
    showError(err.message);
  }
  render();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) {
    showError('Title is required');
    return;
  }
  input.value = '';
  addTask(title);
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((b) => b.classList.remove('active'));
    button.classList.add('active');
    currentFilter = button.dataset.filter;
    render();
  });
});

loadTasks();