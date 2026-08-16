// routes/export.js
// Handles: GET /api/export/csv?key=YOUR_ADMIN_KEY
// Downloads every registration so far as a CSV file.
// Protected by a simple key check because it contains phone numbers.

const express = require('express');
const router = express.Router();
const { Parser } = require('json2csv');
const pool = require('../db');

router.get('/csv', async (req, res) => {
  // ---- simple protection so only you can download this ----
  if (req.query.key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Invalid or missing admin key.' });
  }

  try {
    const result = await pool.query(`
      SELECT
        t.team_id,
        t.domain,
        t.problem_statement,
        t.mentor_name,
        t.mentor_id,
        t.mentor_dept,
        t.mentor_phone,
        s.id_no,
        s.name,
        s.degree,
        s.branch,
        s.year,
        s.gender,
        s.phone,
        s.residential_status,
        s.is_team_lead
      FROM teams t
      JOIN students s ON s.team_id = t.team_id
      ORDER BY t.team_id, s.is_team_lead DESC
    `);

    const parser = new Parser();
    const csv = parser.parse(result.rows);

    res.header('Content-Type', 'text/csv');
    res.attachment(`sih_registrations_${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate CSV.' });
  }
});

module.exports = router;