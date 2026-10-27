// setup-db.js — runs database/schema.sql once to create (and seed) the tasks table.
// Same job as running schema.sql in MySQL Workbench. Run: node setup-db.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./src/db');

async function setup() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf8');

    // Drop comment lines, then split into single statements
    const statements = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await pool.query(statement);
    }

    const [rows] = await pool.query('SELECT id, title, completed FROM tasks ORDER BY id');
    console.log('tasks table is ready');
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error('Setup failed');
    console.error(err.message);
    process.exit(1);
  }
}

setup();
