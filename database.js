// database.js - Dual Database Adapter (Hostinger MySQL + Local SQLite)
const fs = require('fs');
const path = require('path');

let dbDriver = 'sqlite'; // Default fallback
let dbConnection = null;

// Determine if we should connect to Hostinger MySQL
const isMySQLConfigured = process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME;

if (isMySQLConfigured) {
  console.log("abilix-db: Detected MySQL Environment. Connecting to Hostinger MySQL database...");
  const mysql = require('mysql2/promise');
  dbDriver = 'mysql';
  
  dbConnection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
} else {
  console.log("abilix-db: MySQL Env not found. Connecting to Local SQLite database...");
  const sqlite3 = require('sqlite3').verbose();
  const dbFile = path.join(__dirname, 'database.db');
  
  dbDriver = 'sqlite';
  dbConnection = new sqlite3.Database(dbFile);
}

// Universal query wrapper returning standard Promises
async function query(sql, params = []) {
  if (dbDriver === 'mysql') {
    const [results] = await dbConnection.execute(sql, params);
    return results;
  } else {
    return new Promise((resolve, reject) => {
      // In SQLite, sqlite3 commands are separated (run for insert/update, all for select)
      const sqlLower = sql.trim().toLowerCase();
      if (sqlLower.startsWith('select') || sqlLower.startsWith('pragma')) {
        dbConnection.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        dbConnection.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ insertId: this.lastID, affectedRows: this.changes });
        });
      }
    });
  }
}

// Create core CRM tables if not already present
async function initializeTables() {
  console.log("abilix-db: Checking and initializing database tables...");

  // 1. Users Table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      username VARCHAR(64) PRIMARY KEY,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(128) NOT NULL,
      role VARCHAR(32) NOT NULL,
      createdAt VARCHAR(64) NOT NULL
    )
  `);

  // 2. Contacts Table
  await query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id VARCHAR(64) PRIMARY KEY,
      username VARCHAR(64) NOT NULL,
      name VARCHAR(128) NOT NULL,
      email VARCHAR(128) NOT NULL,
      phone VARCHAR(64),
      company VARCHAR(128),
      stage VARCHAR(64),
      status VARCHAR(64),
      owner VARCHAR(128),
      value REAL,
      createdAt VARCHAR(64) NOT NULL
    )
  `);

  // 3. Deals Table
  await query(`
    CREATE TABLE IF NOT EXISTS deals (
      id VARCHAR(64) PRIMARY KEY,
      username VARCHAR(64) NOT NULL,
      name VARCHAR(128) NOT NULL,
      value REAL,
      stage VARCHAR(64),
      closeDate VARCHAR(64),
      contactId VARCHAR(64),
      createdAt VARCHAR(64) NOT NULL
    )
  `);

  // 4. Tasks Table
  await query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(64) PRIMARY KEY,
      username VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      dueDate VARCHAR(64) NOT NULL,
      priority VARCHAR(32) NOT NULL,
      contactId VARCHAR(64) NOT NULL,
      completed INTEGER NOT NULL,
      createdAt VARCHAR(64) NOT NULL
    )
  `);

  // 5. Activities Table
  await query(`
    CREATE TABLE IF NOT EXISTS activities (
      id VARCHAR(64) PRIMARY KEY,
      username VARCHAR(64) NOT NULL,
      type VARCHAR(64) NOT NULL,
      content TEXT NOT NULL,
      contactId VARCHAR(64),
      dealId VARCHAR(64),
      createdAt VARCHAR(64) NOT NULL
    )
  `);

  // 6. Pipeline Stages Table
  await query(`
    CREATE TABLE IF NOT EXISTS pipeline_stages (
      \`key\` VARCHAR(64) NOT NULL,
      username VARCHAR(64) NOT NULL,
      label VARCHAR(128) NOT NULL,
      color VARCHAR(64) NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (\`key\`, username)
    )
  `);

  // 7. Theme Settings Table
  await query(`
    CREATE TABLE IF NOT EXISTS theme (
      username VARCHAR(64) PRIMARY KEY,
      value VARCHAR(32) NOT NULL
    )
  `);

  console.log("abilix-db: Database tables initialized successfully.");
}

module.exports = {
  query,
  initializeTables,
  getDriver: () => dbDriver
};
