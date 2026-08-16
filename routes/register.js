// routes/register.js
// Handles: POST /api/register
// This is where a team's full submission is validated and saved.

const express = require('express');
const router = express.Router();
const pool = require('../db');

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

    const teamResult = await client.query(
      `INSERT INTO teams (domain, problem_statement, mentor_name, mentor_id, mentor_dept, mentor_phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING team_id`,
      [domain, problemStatement, mentor.name, mentor.id, mentor.dept, mentor.phone]
    );
    const teamId = teamResult.rows[0].team_id;

    for (const s of students) {
      await client.query(
        `INSERT INTO students
           (team_id, id_no, name, branch, year, gender, phone, residential_status, is_team_lead)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          teamId,
          s.idNo,
          s.name,
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
    res.json({ success: true, teamId });
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
