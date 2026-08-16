-- Run this once in Supabase's SQL Editor before starting the backend.
-- It creates the two tables that hold all registration data.

CREATE TABLE teams (
  team_id SERIAL PRIMARY KEY,
  domain TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  mentor_name TEXT NOT NULL,
  mentor_id TEXT NOT NULL,
  mentor_dept TEXT NOT NULL,
  mentor_phone TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(team_id),
  id_no TEXT UNIQUE NOT NULL,   -- UNIQUE = the database itself blocks duplicate IDs
  name TEXT NOT NULL,
  branch TEXT NOT NULL,
  year TEXT NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT NOT NULL,
  residential_status TEXT NOT NULL,
  is_team_lead BOOLEAN DEFAULT FALSE
);
