// db.js
// This file's only job: create ONE connection "pool" to Postgres
// and let every other file in the project reuse it.
// A "pool" is just a manager that reuses a handful of open connections
// instead of opening a brand new one for every request (much faster).

require('dotenv').config(); // loads variables from .env into process.env
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // required for Supabase's hosted Postgres
});

module.exports = pool;
