# Task List API — SYD204

A Task List REST API built with **Node.js**, **Express** and **MySQL** (Aiven Cloud), with a small browser frontend.

The same app is built three ways:

| Part | File | Storage | Style |
|---|---|---|---|
| 1 | `server-part1.js` | JavaScript array (lost on restart) | Single file |
| 2 | `server.js` | MySQL | Single file |
| 3 | `server-mvc.js` | MySQL | MVC (routes → controllers → models) |

## Features

- Create, read, update and delete tasks (CRUD)
- Data saved in MySQL, so it survives server restarts
- Input validation with clear error messages (`400`, `404`, `500`)
- Parameterized queries (`?` placeholders) to prevent SQL injection
- Connection pool and SSL connection to Aiven Cloud
- Frontend to add, tick, rename, delete and filter tasks

## Project structure

```
task-api/
├── public/                     Frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/
│   ├── db.js                   MySQL connection pool (SSL + CA)
│   ├── routes/taskRoutes.js    URL + method → controller
│   ├── controllers/taskController.js   Validation + HTTP responses
│   └── models/taskModel.js     SQL queries only
├── database/schema.sql         Creates and seeds the tasks table
├── server-mvc.js               Part 3 entry point (recommended)
├── server.js                   Part 2 single-file MySQL version
├── server-part1.js             Part 1 in-memory version
├── setup-db.js                 Runs schema.sql from the terminal
├── test-db.js                  Checks the MySQL connection
├── .env.example                Template for your .env
└── package.json
```

## Requirements

- Node.js v18 or newer
- An Aiven MySQL service user (username and password)
- The Aiven **CA certificate** (`ca.pem`)

## Setup

1. **Install packages**

   ```bash
   npm install
   ```

2. **Create `.env`.** Copy `.env.example` to `.env`, then fill in your own details:

   ```
   PORT=3000
   DB_HOST=<Host from Aiven Overview>
   DB_PORT=<Port from Aiven Overview>
   DB_USER=<your Aiven username>
   DB_PASS=<your Aiven password>
   DB_NAME=defaultdb
   DB_SSL=REQUIRED
   ```

3. **Add the CA certificate.** In Aiven, open the MySQL service, go to **Overview → Connection information → CA certificate** and download it. Save it as `ca.pem` in the project root.

4. **Test the connection**

   ```bash
   node test-db.js
   ```

   You should see `Connected to MySQL`.

5. **Create the `tasks` table** (only once)

   ```bash
   node setup-db.js
   ```

   You can also run `database/schema.sql` in MySQL Workbench instead.

## Running

| Command | What it runs |
|---|---|
| `npm run start:mvc` | Part 3, MVC + MySQL (recommended) |
| `npm start` | Part 2, single file + MySQL |
| `npm run dev` | Part 2 with auto-restart (nodemon) |
| `npm run start:memory` | Part 1, in-memory (no database needed) |

Once the server is running:

- **Frontend:** http://localhost:3000/app
- **API:** http://localhost:3000/tasks

Keep the terminal open while you use the app. Press **Ctrl + C** to stop the server.

## API endpoints

| Method | URL | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/` | none | `200` health check | |
| GET | `/tasks` | none | `200` array of tasks | `500` |
| GET | `/tasks/:id` | none | `200` one task | `404` |
| POST | `/tasks` | `{ "title": "Learn Node" }` | `201` new task | `400` |
| PUT | `/tasks/:id` | `{ "title": "...", "completed": true }` | `200` updated task | `400`, `404` |
| PATCH | `/tasks/:id` | `{ "completed": true }` or `{ "title": "..." }` | `200` updated task | `400`, `404` |
| DELETE | `/tasks/:id` | none | `204` empty body | `404` |

### Example task

```json
{
  "id": 7,
  "title": "Learn Express.js",
  "completed": 0,
  "created_at": "2026-10-27T03:00:00.000Z",
  "updated_at": "2026-10-27T03:00:00.000Z"
}
```

MySQL stores `completed` as `0` or `1`. The frontend treats both `0`/`1` and `true`/`false` correctly.

### Error format

```json
{ "error": "Title is required" }
```

## How a request flows (MVC)

```
Browser / Postman
      │  HTTP request
      ▼
server-mvc.js        middleware (CORS, JSON), mounts /tasks
      ▼
taskRoutes.js        which URL + method?        (the menu)
      ▼
taskController.js    validate, choose status    (the chef)
      ▼
taskModel.js         run SQL with ? placeholders (the pantry)
      ▼
MySQL (Aiven)        permanent storage
```

Errors in any layer are passed to `next(err)` and handled by the global error handler at the bottom of `server-mvc.js`.

## Security notes

- `.env` holds the database password and is listed in `.gitignore`. **Never commit it.**
- Every user value goes through `?` placeholders. A title such as `'; DROP TABLE tasks; --` is stored as plain text.
- SSL certificate checking stays on (`rejectUnauthorized: true`), using Aiven's CA in `ca.pem`.
- The frontend shows titles with `textContent`, so HTML in a title is displayed as text, not run as code.

## Troubleshooting

| Message | Cause | Fix |
|---|---|---|
| `Failed to fetch` (in the page) | API server isn't running | Run `npm run start:mvc` and keep the terminal open |
| `Unexpected token '<' ... not valid JSON` | Page is calling the wrong server | `API_URL` in `public/app.js` must be `http://localhost:3000/tasks` |
| `getaddrinfo ENOTFOUND` | Wrong host, or the Aiven service is powered off | Copy Host from Aiven Overview, and check the service is **Running** |
| `self-signed certificate in certificate chain` | Missing Aiven CA | Download the CA certificate as `ca.pem` into the project root |
| `Access denied for user` | Wrong username or password | Check `DB_USER` and `DB_PASS` in `.env` |
| `Table 'defaultdb.tasks' doesn't exist` | Table not created yet | Run `node setup-db.js` |
| `EADDRINUSE :::3000` | A server is already running | Stop the other one with Ctrl + C |

## Tech stack

Node.js · Express 4 · mysql2 · dotenv · nodemon · Aiven MySQL 8.4 · HTML/CSS/JavaScript
