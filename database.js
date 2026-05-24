// database.js - Hostinger MySQL adapter
const mysql = require('mysql2/promise');

const REQUIRED_DB_ENV = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const CONNECTION_ERROR_CODES = new Set([
  'ER_ACCESS_DENIED_ERROR',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'PROTOCOL_CONNECTION_LOST'
]);

let dbConnection = null;
let dbReady = false;
let lastError = null;

function getEnvValue(key) {
  return process.env[key];
}

function getTrimmedEnvValue(key) {
  return (getEnvValue(key) || '').trim();
}

function buildConfigError(message) {
  const error = new Error(message);
  error.code = 'DB_CONFIG_ERROR';
  return error;
}

function readDatabaseConfig() {
  const missing = REQUIRED_DB_ENV.filter((key) => !getEnvValue(key));
  if (missing.length > 0) {
    throw buildConfigError(`Missing required database environment variables: ${missing.join(', ')}`);
  }

  const portValue = getTrimmedEnvValue('DB_PORT');
  const port = Number.parseInt(portValue, 10);
  if (!/^\d+$/.test(portValue) || !Number.isInteger(port) || port <= 0 || port > 65535) {
    throw buildConfigError('DB_PORT must be a valid TCP port number.');
  }

  const host = getTrimmedEnvValue('DB_HOST');
  const database = getTrimmedEnvValue('DB_NAME');
  const user = getTrimmedEnvValue('DB_USER');
  if (!host || !database || !user) {
    throw buildConfigError('DB_HOST, DB_NAME, and DB_USER must not be blank.');
  }

  return {
    host,
    port,
    database,
    user,
    password: getEnvValue('DB_PASSWORD'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000
  };
}

function getSafeConfig() {
  try {
    const config = readDatabaseConfig();
    return {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user
    };
  } catch (error) {
    return null;
  }
}

function rememberError(error) {
  lastError = {
    code: error.code || 'UNKNOWN',
    message: error.message,
    errno: error.errno,
    sqlState: error.sqlState
  };
}

function formatDatabaseError(error) {
  const details = [
    error.code && `code=${error.code}`,
    error.errno && `errno=${error.errno}`,
    error.sqlState && `sqlState=${error.sqlState}`
  ].filter(Boolean);

  return details.length > 0 ? `${error.message} (${details.join(', ')})` : error.message;
}

function logInitializationError(error) {
  rememberError(error);

  console.error('abilix-db: Database initialization failed.');
  console.error(`abilix-db: ${formatDatabaseError(error)}`);

  const safeConfig = getSafeConfig();
  if (safeConfig) {
    console.error(
      `abilix-db: Attempted MySQL target ${safeConfig.user}@${safeConfig.host}:${safeConfig.port}/${safeConfig.database}`
    );
  } else {
    console.error(`abilix-db: Required env vars: ${REQUIRED_DB_ENV.join(', ')}`);
  }
}

function getConnectionPool() {
  if (!dbConnection) {
    const config = readDatabaseConfig();
    console.log(`abilix-db: Creating MySQL pool for ${config.user}@${config.host}:${config.port}/${config.database}`);
    dbConnection = mysql.createPool(config);
  }

  return dbConnection;
}

async function pingDatabase() {
  const connection = await getConnectionPool().getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

// Universal query wrapper returning standard Promises.
async function query(sql, params = []) {
  try {
    const [results] = await getConnectionPool().execute(sql, params);
    return results;
  } catch (error) {
    if (CONNECTION_ERROR_CODES.has(error.code)) {
      dbReady = false;
      rememberError(error);
    }
    throw error;
  }
}

// Create core CRM tables if not already present.
async function initializeTables() {
  console.log('abilix-db: Checking MySQL connection and initializing database tables...');

  try {
    await pingDatabase();

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

    dbReady = true;
    lastError = null;
    console.log('abilix-db: Database tables initialized successfully.');
    return true;
  } catch (error) {
    dbReady = false;
    logInitializationError(error);
    return false;
  }
}

function getStatus() {
  return {
    driver: 'mysql',
    ready: dbReady,
    config: getSafeConfig(),
    lastError
  };
}

module.exports = {
  query,
  initializeTables,
  isReady: () => dbReady,
  getStatus,
  getDriver: () => 'mysql'
};
