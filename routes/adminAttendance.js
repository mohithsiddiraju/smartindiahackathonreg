// routes/adminAttendance.js
// Everything an ORGANIZER needs to run the attendance system:
//   - create/update room passwords
//   - bulk-assign teams to rooms (from an Excel import you do in the browser)
//   - lock/unlock the 3 sessions
//   - view the full attendance overview

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAdminKey } = require('../middleware/auth');

router.use(requireAdminKey); // every route below requires ?key=YOUR_ADMIN_KEY

// ---- Rooms ----

// List all rooms (never returns password hashes)
router.get('/rooms', async (req, res) => {
  try {
    const result = await pool.query('SELECT room_code FROM rooms ORDER BY room_code');
    res.json({ rooms: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch rooms.' });
  }
});

// Create a room, or reset its password if it already exists.
router.post('/rooms', async (req, res) => {
  const { roomCode, password } = req.body;
  if (!roomCode || !password) {
    return res.status(400).json({ error: 'roomCode and password are required.' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO rooms (room_code, password_hash) VALUES ($1, $2)
       ON CONFLICT (room_code) DO UPDATE SET password_hash = $2`,
      [roomCode, hash]
    );
    res.json({ success: true, roomCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save room.' });
  }
});

// Delete a room (only if no teams currently point to it)
router.delete('/rooms/:roomCode', async (req, res) => {
  const { roomCode } = req.params;
  try {
    const inUse = await pool.query('SELECT 1 FROM teams WHERE room_code = $1 LIMIT 1', [roomCode]);
    if (inUse.rows.length > 0) {
      return res.status(409).json({ error: 'Cannot delete: teams are still assigned to this room.' });
    }
    await pool.query('DELETE FROM rooms WHERE room_code = $1', [roomCode]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete room.' });
  }
});

// ---- Bulk-assign teams to rooms ----
// Body: { assignments: [{ displayId: "AI001", roomCode: "R101" }, ...] }
// You'll build this array in admin.html from an uploaded Excel file.
router.post('/bulk-assign', async (req, res) => {
  const { assignments } = req.body;
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return res.status(400).json({ error: 'No assignments provided.' });
  }

  const results = { updated: 0, notFound: [] };

  for (const a of assignments) {
    if (!a.displayId || !a.roomCode) continue;
    const result = await pool.query(
      'UPDATE teams SET room_code = $1 WHERE display_id = $2',
      [a.roomCode, a.displayId]
    );
    if (result.rowCount > 0) {
      results.updated++;
    } else {
      results.notFound.push(a.displayId);
    }
  }

  res.json({ success: true, ...results });
});

// ---- Sessions ----

router.get('/sessions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sessions ORDER BY session_id');
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch sessions.' });
  }
});

// Body: { isLocked: true | false }
router.patch('/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { isLocked } = req.body;
  try {
    await pool.query('UPDATE sessions SET is_locked = $1 WHERE session_id = $2', [isLocked, sessionId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update session.' });
  }
});

// ---- Attendance overview ----
router.get('/overview', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.display_id,
        t.domain,
        t.room_code,
        s.session_id,
        s.label AS session_label,
        a.status,
        a.marked_at
      FROM teams t
      LEFT JOIN attendance a ON a.team_id = t.team_id
      LEFT JOIN sessions s ON s.session_id = a.session_id
      ORDER BY t.room_code NULLS LAST, t.display_id, s.session_id
    `);
    res.json({ rows: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch attendance overview.' });
  }
});

module.exports = router;
