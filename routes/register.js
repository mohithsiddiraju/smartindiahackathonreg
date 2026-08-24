// routes/register.js
// Handles: POST /api/register
// This is where a team's full submission is validated and saved.

const express = require('express');
const router = express.Router();
const pool = require('../db');

// Maps each domain to the short code used in the display ID, e.g. "AI/ML" -> "AI".
// Edit this to match your actual domain list if you change DOMAIN_DATA in the frontend.
const DOMAIN_CODES = {
  'AI/ML': 'AI',
  'Blockchain': 'BC',
  'Healthcare': 'HC',
  'Smart Automation': 'SA',
  'Fintech': 'FT',
  'Miscellaneous': 'MS'
};

function domainCodeFor(domain) {
  if (DOMAIN_CODES[domain]) return DOMAIN_CODES[domain];
  // fallback for any domain not in the map above: first 2 letters, uppercased
  const letters = domain.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return letters.slice(0, 2) || 'GN';
}

router.post('/', async (req, res) => {
  const { domain, problemStatement, mentor, students } = req.body;

  // ---- Basic presence checks ----
  if (!domain || !problemStatement || !mentor || !students) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // ---- Constraint 1: exactly 6 members ----
  if (students.length !== 6) {
    return res.status(400).json({ error: 'Team must have exactly 6 members.' });
  }

  // ---- Constraint 2: at least one female member ----
  const hasFemale = students.some((s) => s.gender === 'Female');
  if (!hasFemale) {
    return res.status(400).json({ error: 'Team must include at least one female member.' });
  }

  // ---- Constraint 3: no duplicate ID numbers within the submitted team itself ----
  const idsInThisTeam = students.map((s) => s.idNo);
  const uniqueIds = new Set(idsInThisTeam);
  if (uniqueIds.size !== idsInThisTeam.length) {
    return res.status(400).json({ error: 'Duplicate ID numbers within the same team.' });
  }

  // ---- Save to database inside a TRANSACTION ----
  // A transaction means: either ALL these inserts succeed, or NONE of them do.
  // This prevents a half-saved team if something fails partway through.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ---- Get the next number for this domain, atomically ----
    // This single UPDATE-or-INSERT is safe even if two teams in the same
    // domain submit at the exact same moment: Postgres locks this row
    // during the query, so the second request simply waits its turn.
    const domainCode = domainCodeFor(domain);
    const counterResult = await client.query(
      `INSERT INTO domain_counters (domain_code, counter)
       VALUES ($1, 1)
       ON CONFLICT (domain_code) DO UPDATE SET counter = domain_counters.counter + 1
       RETURNING counter`,
      [domainCode]
    );
    const counter = counterResult.rows[0].counter;
    const displayId = `${domainCode}${String(counter).padStart(3, '0')}`; // e.g. "AI003"

    const teamResult = await client.query(
      `INSERT INTO teams (display_id, domain, problem_statement, mentor_name, mentor_id, mentor_dept, mentor_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING team_id`,
      [displayId, domain, problemStatement, mentor.name, mentor.id, mentor.dept, mentor.phone]
    );
    const teamId = teamResult.rows[0].team_id;

    for (const s of students) {
      await client.query(
        `INSERT INTO students
           (team_id, id_no, name, degree, branch, year, gender, phone, residential_status, is_team_lead)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          teamId,
          s.idNo,
          s.name,
          s.degree,
          s.branch,
          s.year,
          s.gender,
          s.phone,
          s.residentialStatus,
          s.isTeamLead || false
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, teamId: displayId });
  } catch (err) {
    await client.query('ROLLBACK'); // undo everything from this attempt

    // Postgres error code 23505 = "unique_violation" — this fires automatically
    // because of the UNIQUE constraint on id_no in schema.sql.
    if (err.code === '23505') {
      const match = err.detail && err.detail.match(/\(id_no\)=\((.+?)\)/);
      const dupId = match ? match[1] : 'unknown';
      return res.status(409).json({ error: `ID No already registered: ${dupId}` });
    }

    console.error(err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  } finally {
    client.release(); // always give the connection back to the pool
  }
});

module.exports = router;