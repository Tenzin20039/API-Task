// server-mvc.js — PART 3 complete (MVC entry point)
require('dotenv').config();

const express = require('express');
const taskRoutes = require('./src/routes/taskRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS — lets a page opened from another address (e.g. Live Server on :5500) call this API
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

// Frontend (the dining room) — open http://localhost:3000/app
app.use('/app', express.static('public'));

app.get('/', (req, res) => {
  res.json({ message: 'Task API (MVC version) is ready!' });
});

// Every route inside taskRoutes is prefixed with /tasks
app.use('/tasks', taskRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`MVC server running at http://localhost:${PORT}`);
});
