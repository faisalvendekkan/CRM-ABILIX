# Hostinger Node.js Deployment Guide - Abilix CRM

Domain: `crm1.abilix.in`
Runtime: Node.js `18.x`
Entry point: `server.js`
Start command: `npm start`

## 1. Create The MySQL Database

1. Open Hostinger hPanel.
2. Go to Databases > MySQL Databases.
3. Create a database and user.
4. Copy these values:
   - Database host, usually `localhost`
   - Database port, usually `3306`
   - Database name
   - Database username
   - Database password

Abilix CRM uses Hostinger MySQL in production. The local `database.db` SQLite file is ignored and must not be deployed.

## 2. Configure The Node.js App

In Hostinger's Node.js panel:

| Setting | Value |
| --- | --- |
| Domain | `crm1.abilix.in` |
| Node.js version | `18.x` |
| Application root | Your deployed repository folder |
| Application entry point | `server.js` |
| Startup file | `server.js` |
| Start command | `npm start` |

The server binds to `process.env.PORT || 3000` on `0.0.0.0`, which is required for Hostinger managed Node.js hosting.

## 3. Required Environment Variables

Add these in the Hostinger Node.js dashboard:

| Variable | Required value |
| --- | --- |
| `PORT` | Hostinger-provided port, or `3000` if Hostinger asks for one |
| `JWT_SECRET` | A long random secret string |
| `DB_HOST` | Hostinger MySQL host, usually `localhost` |
| `DB_PORT` | `3306` |
| `DB_NAME` | Your Hostinger MySQL database name |
| `DB_USER` | Your Hostinger MySQL username |
| `DB_PASSWORD` | Your Hostinger MySQL password |

The app intentionally fails at startup if `JWT_SECRET` is missing or if only part of the MySQL configuration is provided.

## 4. GitHub Deployment

Commit and push the repository without generated or secret files:

- Do not commit `.env`
- Do not commit `node_modules/`
- Do not commit `database.db`
- Do commit `package.json`, `package-lock.json`, `server.js`, `database.js`, `public/`, and `.env.example`

Hostinger will run `npm install` from `package-lock.json`. Production dependencies are pure JavaScript plus `mysql2`; `sqlite3` has been removed from production dependencies to avoid native build failures.

## 5. Start And Verify

1. Deploy from GitHub in Hostinger.
2. Click Run npm install if Hostinger does not do it automatically.
3. Restart the Node.js app.
4. Open `https://crm1.abilix.in`.
5. Confirm the login screen loads.
6. Check Hostinger logs if startup fails; missing env vars will be named explicitly.
