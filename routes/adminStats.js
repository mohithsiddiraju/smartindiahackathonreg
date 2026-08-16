// routes/adminStats.js
// Handles: GET /api/admin/stats?key=ADMIN_KEY
// Returns aggregate counts for the admin dashboard — domains, degrees,
// branches, years, gender, residential status, etc.

const express = require('express');
const router = express.Router();
const pool = require('../db');

function requireAdminKey(req, res, next) {
  if (req.query.key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Invalid or missing admin key.' });
  }
  next();
}

router.get('/stats', requireAdminKey, async (req, res) => {
  try {
    const [
      teamCount,
      studentCount,
      byDomain,
      byDegree,
      byBranch,
      byYear,
      byGender,
      byResidential,
      teamsWithFemale
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM teams'),
      pool.query('SELECT COUNT(*)::int AS count FROM students'),
      pool.query(`SELECT domain, COUNT(DISTINCT team_id)::int AS count
                  FROM teams GROUP BY domain ORDER BY count DESC`),
      pool.query(`SELECT degree, COUNT(*)::int AS count
                  FROM students GROUP BY degree ORDER BY count DESC`),
      pool.query(`SELECT branch, COUNT(*)::int AS count
                  FROM students GROUP BY branch ORDER BY count DESC`),
      pool.query(`SELECT year, COUNT(*)::int AS count
                  FROM students GROUP BY year ORDER BY year ASC`),
      pool.query(`SELECT gender, COUNT(*)::int AS count
                  FROM students GROUP BY gender ORDER BY count DESC`),
      pool.query(`SELECT residential_status, COUNT(*)::int AS count
                  FROM students GROUP BY residential_status ORDER BY count DESC`),
      pool.query(`SELECT COUNT(*)::int AS count FROM (
                    SELECT team_id FROM students WHERE gender = 'Female' GROUP BY team_id
                  ) t`)
    ]);

    res.json({
      totalTeams: teamCount.rows[0].count,
      totalStudents: studentCount.rows[0].count,
      teamsWithFemaleMember: teamsWithFemale.rows[0].count,
      byDomain: byDomain.rows,
      byDegree: byDegree.rows,
      byBranch: byBranch.rows,
      byYear: byYear.rows,
      byGender: byGender.rows,
      byResidential: byResidential.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not compute statistics.' });
  }
});

module.exports = router;