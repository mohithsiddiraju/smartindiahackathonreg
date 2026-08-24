// routes/volunteer.js
// Everything a ROOM VOLUNTEER can do: log in, see their room's teams,
// and mark attendance — all scoped to their own room only.

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireVolunteerAuth } = require('../middleware/auth');

// ---- Login ----
// Body: { roomCode, password }
router.post('/login', async (req, res) => {
  const { roomCode, password } = req.body;
  if (!roomCode || !password) {
    return res.status(400).json({ error: 'Room code and password are required.' });
  }

  try {
    const result = await pool.query('SELECT * FROM rooms WHERE room_code = $1', [roomCode]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid room code or password.' });
    }

    const room = result.rows[0];
    const match = await bcrypt.compare(password, room.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid room code or password.' });
    }

    // Token carries the room code — every future request proves who they are
    // via this signed token, not by trusting anything the frontend sends.
    const token = jwt.sign({ roomCode }, process.env.JWT_SECRET, { expiresIn: '2d' });
    res.json({ success: true, token, roomCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// Everything below this line requires a valid volunteer token.
router.use(requireVolunteerAuth);

// ---- Get this room's teams + attendance status + session lock state ----
router.get('/teams', async (req, res) => {
  try {
    const [teamsResult, sessionsResult, attendanceResult] = await Promise.all([
      pool.query(
        `SELECT team_id, display_id, domain, problem_statement
         FROM teams WHERE room_code = $1 ORDER BY display_id`,
        [req.roomCode]
      ),
      pool.query('SELECT * FROM sessions ORDER BY session_id'),
      pool.query(
        `SELECT a.team_id, a.session_id, a.status
         FROM attendance a
         JOIN teams t ON t.team_id = a.team_id
         WHERE t.room_code = $1`,
        [req.roomCode]
      )
    ]);

    res.json({
      roomCode: req.roomCode,
      teams: teamsResult.rows,
      sessions: sessionsResult.rows,
      attendance: attendanceResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load room data.' });
  }
});

// ---- Mark attendance ----
// Body: { teamId (numeric team_id), sessionId, status: "Present" | "Absent" }
router.post('/attendance', async (req, res) => {
  const { teamId, sessionId, status } = req.body;
  if (!teamId || !sessionId || !['Present', 'Absent'].includes(status)) {
    return res.status(400).json({ error: 'teamId, sessionId, and a valid status are required.' });
  }

  try {
    // Security check: does this team actually belong to the volunteer's own room?
    // This stops a volunteer from marking attendance for another room's team,
    // even if they somehow guessed or tampered with a team_id.
    const teamCheck = await pool.query(
      'SELECT room_code FROM teams WHERE team_id = $1',
      [teamId]
    );
    if (teamCheck.rows.length === 0 || teamCheck.rows[0].room_code !== req.roomCode) {
      return res.status(403).json({ error: 'That team is not assigned to your room.' });
    }

    // Is this session currently locked by the organizer?
    const sessionCheck = await pool.query(
      'SELECT is_locked FROM sessions WHERE session_id = $1',
      [sessionId]
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    if (sessionCheck.rows[0].is_locked) {
      return res.status(423).json({ error: 'This session is locked. Attendance cannot be changed right now.' });
    }

    await pool.query(
      `INSERT INTO attendance (team_id, session_id, status, marked_by, marked_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (team_id, session_id)
       DO UPDATE SET status = $3, marked_by = $4, marked_at = NOW()`,
      [teamId, sessionId, status, req.roomCode]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save attendance.' });
  }
});

module.exports = router;
