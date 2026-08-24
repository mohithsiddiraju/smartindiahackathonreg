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
        t.display_id,
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

    if (result.rows.length === 0) {
      // No registrations yet — return an empty CSV with just headers instead of erroring.
      const emptyHeaders = [
        'team_id', 'domain', 'problem_statement', 'mentor_name', 'mentor_id',
        'mentor_dept', 'mentor_phone', 'id_no', 'name', 'degree', 'branch',
        'year', 'gender', 'phone', 'residential_status', 'is_team_lead'
      ];
      res.header('Content-Type', 'text/csv');
      res.attachment(`sih_registrations_${Date.now()}.csv`);
      return res.send(emptyHeaders.join(',') + '\n');
    }

    const parser = new Parser();
    const csv = parser.parse(result.rows);

    res.header('Content-Type', 'text/csv');
    res.attachment(`sih_registrations_${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('CSV export failed:', err.message, err.stack);
    res.status(500).json({ error: 'Could not generate CSV.' });
  }
});

module.exports = router;