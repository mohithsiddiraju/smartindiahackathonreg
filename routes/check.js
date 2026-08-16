// routes/check.js
// Handles: GET /api/registrations/check/:idNo
// Used by the frontend to show "already registered" instantly while
// someone is filling the form, before they even hit submit.

const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/check/:idNo', async (req, res) => {
  const { idNo } = req.params;

  try {
    const result = await pool.query(
      'SELECT id_no FROM students WHERE id_no = $1',
      [idNo]
    );
    const alreadyRegistered = result.rows.length > 0;
    res.json({ idNo, alreadyRegistered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not check ID.' });
  }
});

module.exports = router;
