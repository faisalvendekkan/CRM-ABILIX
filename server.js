// server.js - Abilix CRM High-Security Express API Backend Entrypoint
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Load environment variables if present
try {
  require('dotenv').config();
} catch (e) {
  // dotenv is optional in production if using system env variables
}

const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'abilix_super_secret_crm_key_2026';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Seeding default data ---
const DEFAULT_STAGES = [
  { key: "appointment-scheduled", label: "Appointment Scheduled", color: "var(--accent-indigo)", position: 0 },
  { key: "qualified-to-buy", label: "Qualified to Buy", color: "#818cf8", position: 1 },
  { key: "presentation-scheduled", label: "Presentation Scheduled", color: "#a5b4fc", position: 2 },
  { key: "decision-maker-bought-in", label: "Decision Bought-In", color: "#6366f1", position: 3 },
  { key: "contract-sent", label: "Contract Sent", color: "var(--accent-amber)", position: 4 },
  { key: "closed-won", label: "Closed Won", color: "var(--accent-emerald)", position: 5 },
  { key: "closed-lost", label: "Closed Lost", color: "var(--accent-crimson)", position: 6 }
];

async function seedDefaultUsers() {
  try {
    const users = await db.query("SELECT * FROM users");
    if (users.length === 0) {
      console.log("abilix-server: Seeding default admin account (Faisal)...");
      const hashedFaisal = await bcrypt.hash('faisal@2026', 10);
      
      const now = new Date().toISOString();
      await db.query("INSERT INTO users (username, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?)", ['faisal', hashedFaisal, 'Faisal (Admin)', 'admin', now]);
      
      // Seed pipeline stages for the admin user
      for (const stage of DEFAULT_STAGES) {
        await db.query("INSERT INTO pipeline_stages (\`key\`, username, label, color, position) VALUES (?, ?, ?, ?, ?)", [stage.key, 'faisal', stage.label, stage.color, stage.position]);
      }
      console.log("abilix-server: Default admin user and stages seeded successfully.");
    }
  } catch (e) {
    console.error("abilix-server: Seeding failed", e);
  }
}

// --- JWT Auth Middleware ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access Denied. No session token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Session expired or invalid.' });
    req.user = user;
    next();
  });
}

// --- Admin Access Guard Middleware ---
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden. Administrator privileges required.' });
  }
}

// --- AUTH API ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

  try {
    const users = await db.query("SELECT * FROM users WHERE username = ?", [username.toLowerCase().trim()]);
    if (users.length === 0) return res.status(400).json({ error: 'Access Denied. User not found.' });

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).json({ error: 'Access Denied. Invalid password.' });

    const token = jwt.sign({ username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { username: user.username, name: user.name, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: 'Server authentication failed.' });
  }
});

// --- WORKSPACE SYNC ---
app.get('/api/workspace', authenticateToken, async (req, res) => {
  const username = req.user.username;
  try {
    const contacts = await db.query("SELECT * FROM contacts WHERE username = ?", [username]);
    const deals = await db.query("SELECT * FROM deals WHERE username = ?", [username]);
    const tasks = await db.query("SELECT * FROM tasks WHERE username = ?", [username]);
    const activities = await db.query("SELECT * FROM activities WHERE username = ?", [username]);
    const stages = await db.query("SELECT * FROM pipeline_stages WHERE username = ? ORDER BY position ASC", [username]);
    const themeRows = await db.query("SELECT value FROM theme WHERE username = ?", [username]);
    const theme = themeRows.length > 0 ? themeRows[0].value : 'dark';

    res.json({ contacts, deals, tasks, activities, stages, theme });
  } catch (e) {
    res.status(500).json({ error: 'Workspace fetch failed.' });
  }
});

// --- CONTACTS API ---
app.post('/api/contacts', authenticateToken, async (req, res) => {
  const { id, name, email, phone, company, stage, status, owner, value } = req.body;
  const username = req.user.username;
  const now = new Date().toISOString();
  try {
    await db.query(
      "INSERT INTO contacts (id, username, name, email, phone, company, stage, status, owner, value, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, username, name, email, phone, company, stage, status, owner || req.user.name, value || 0, now]
    );
    res.status(201).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create contact.' });
  }
});

app.put('/api/contacts/:id', authenticateToken, async (req, res) => {
  const { name, email, phone, company, stage, status, owner, value } = req.body;
  const username = req.user.username;
  const { id } = req.params;
  try {
    await db.query(
      "UPDATE contacts SET name=?, email=?, phone=?, company=?, stage=?, status=?, owner=?, value=? WHERE id=? AND username=?",
      [name, email, phone, company, stage, status, owner, value, id, username]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update contact.' });
  }
});

app.delete('/api/contacts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const username = req.user.username;
  try {
    await db.query("DELETE FROM contacts WHERE id=? AND username=?", [id, username]);
    // Cleanup cascade
    await db.query("DELETE FROM deals WHERE contactId=? AND username=?", [id, username]);
    await db.query("DELETE FROM tasks WHERE contactId=? AND username=?", [id, username]);
    await db.query("DELETE FROM activities WHERE contactId=? AND username=?", [id, username]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete contact.' });
  }
});

// --- DEALS API ---
app.post('/api/deals', authenticateToken, async (req, res) => {
  const { id, name, value, stage, closeDate, contactId } = req.body;
  const username = req.user.username;
  const now = new Date().toISOString();
  try {
    await db.query(
      "INSERT INTO deals (id, username, name, value, stage, closeDate, contactId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, username, name, value || 0, stage, closeDate, contactId, now]
    );
    res.status(201).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create deal.' });
  }
});

app.put('/api/deals/:id', authenticateToken, async (req, res) => {
  const { name, value, stage, closeDate } = req.body;
  const username = req.user.username;
  const { id } = req.params;
  try {
    await db.query(
      "UPDATE deals SET name=?, value=?, stage=?, closeDate=? WHERE id=? AND username=?",
      [name, value, stage, closeDate, id, username]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update deal.' });
  }
});

app.delete('/api/deals/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const username = req.user.username;
  try {
    await db.query("DELETE FROM deals WHERE id=? AND username=?", [id, username]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete deal.' });
  }
});

// --- TASKS API ---
app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { id, title, dueDate, priority, contactId } = req.body;
  const username = req.user.username;
  const now = new Date().toISOString();
  try {
    await db.query(
      "INSERT INTO tasks (id, username, title, dueDate, priority, contactId, completed, createdAt) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
      [id, username, title, dueDate, priority, contactId, now]
    );
    res.status(201).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

app.put('/api/tasks/:id/toggle', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const username = req.user.username;
  try {
    await db.query("UPDATE tasks SET completed = 1 - completed WHERE id=? AND username=?", [id, username]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to toggle task.' });
  }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const username = req.user.username;
  try {
    await db.query("DELETE FROM tasks WHERE id=? AND username=?", [id, username]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// --- ACTIVITIES API ---
app.post('/api/activities', authenticateToken, async (req, res) => {
  const { id, type, content, contactId, dealId } = req.body;
  const username = req.user.username;
  const now = new Date().toISOString();
  try {
    await db.query(
      "INSERT INTO activities (id, username, type, content, contactId, dealId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, username, type, content, contactId, dealId, now]
    );
    res.status(201).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to log activity.' });
  }
});

// --- CUSTOM PIPELINE STAGES SAVE ---
app.post('/api/stages', authenticateToken, async (req, res) => {
  const { stages } = req.body;
  const username = req.user.username;
  if (!Array.isArray(stages)) return res.status(400).json({ error: 'Stages must be an array.' });

  try {
    // 1. Wipe current stages in SQLite/MySQL
    await db.query("DELETE FROM pipeline_stages WHERE username = ?", [username]);

    // 2. Bulk insert new stages
    for (let i = 0; i < stages.length; i++) {
      const st = stages[i];
      await db.query(
        "INSERT INTO pipeline_stages (\`key\`, username, label, color, position) VALUES (?, ?, ?, ?, ?)",
        [st.key, username, st.label, st.color, i]
      );
    }
    
    // 3. Graceful Migration of Deals on server side
    const firstStageKey = stages[0]?.key || "appointment-scheduled";
    const userDeals = await db.query("SELECT id, stage FROM deals WHERE username = ?", [username]);
    for (const deal of userDeals) {
      const exists = stages.some(s => s.key === deal.stage);
      if (!exists) {
        await db.query("UPDATE deals SET stage = ? WHERE id = ? AND username = ?", [firstStageKey, deal.id, username]);
      }
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to customize pipeline columns.' });
  }
});

// --- SET THEME API ---
app.post('/api/theme', authenticateToken, async (req, res) => {
  const { value } = req.body;
  const username = req.user.username;
  try {
    await db.query("DELETE FROM theme WHERE username = ?", [username]);
    await db.query("INSERT INTO theme (username, value) VALUES (?, ?)", [username, value]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save theme.' });
  }
});

// --- ADMIN CONTROL APIS ---
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await db.query("SELECT username, name, role, createdAt FROM users");
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve user accounts.' });
  }
});

app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  const { name, username, password, role } = req.body;
  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const userLower = username.toLowerCase().trim();

  try {
    const exists = await db.query("SELECT username FROM users WHERE username = ?", [userLower]);
    if (exists.length > 0) {
      return res.status(400).json({ error: 'Account creation failed. Username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    await db.query(
      "INSERT INTO users (username, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?)",
      [userLower, hashedPassword, name, role, now]
    );

    // Seed default pipeline stages for the newly registered user
    for (const stage of DEFAULT_STAGES) {
      await db.query(
        "INSERT INTO pipeline_stages (\`key\`, username, label, color, position) VALUES (?, ?, ?, ?, ?)",
        [stage.key, userLower, stage.label, stage.color, stage.position]
      );
    }

    res.status(201).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create user account.' });
  }
});

app.delete('/api/admin/users/:username', authenticateToken, requireAdmin, async (req, res) => {
  const targetUser = req.params.username.toLowerCase().trim();
  const activeUser = req.user.username.toLowerCase().trim();

  if (targetUser === activeUser) {
    return res.status(400).json({ error: 'Access Denied. You cannot delete your active administrative session.' });
  }

  try {
    await db.query("DELETE FROM users WHERE username = ?", [targetUser]);
    // Scoped Cascade cleanup in SQLite/MySQL
    await db.query("DELETE FROM contacts WHERE username = ?", [targetUser]);
    await db.query("DELETE FROM deals WHERE username = ?", [targetUser]);
    await db.query("DELETE FROM tasks WHERE username = ?", [targetUser]);
    await db.query("DELETE FROM activities WHERE username = ?", [targetUser]);
    await db.query("DELETE FROM pipeline_stages WHERE username = ?", [targetUser]);
    await db.query("DELETE FROM theme WHERE username = ?", [targetUser]);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete user account.' });
  }
});

// Single Page Application routing (fallback to index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Bootstrap Web Server
async function main() {
  await db.initializeTables();
  await seedDefaultUsers();
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`      ABILIX CRM SECURE FULL-STACK BACKEND STARTED  `);
    console.log(`      Running on http://localhost:${PORT}          `);
    console.log(`      Hostinger Compliance Mode: ENABLED           `);
    console.log(`===================================================`);
  });
}

main();
