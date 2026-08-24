// middleware/auth.js
// Two small gatekeepers reused across routes:
//   requireAdminKey    -> for you (the organizer)
//   requireVolunteerAuth -> for room volunteers, after they log in

const jwt = require('jsonwebtoken');

function requireAdminKey(req, res, next) {
  if (req.query.key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Invalid or missing admin key.' });
  }
  next();
}

// Volunteers send "Authorization: Bearer <token>" after logging in.
// The token was signed at login with the room code baked in, so we
// never have to trust the frontend about which room someone belongs to.
function requireVolunteerAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Not logged in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.roomCode = decoded.roomCode; // every downstream route trusts THIS, not the request body
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

module.exports = { requireAdminKey, requireVolunteerAuth };
