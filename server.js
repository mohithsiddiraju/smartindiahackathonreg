// server.js
// This is the entry point. Running "node server.js" starts your backend.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const registerRoute = require('./routes/register');
const checkRoute = require('./routes/check');
const exportRoute = require('./routes/export');
const adminStatsRoute = require('./routes/adminStats');

const app = express();

app.use(cors());          // allows your React frontend (different domain) to call this API
app.use(express.json());  // lets Express understand JSON sent in request bodies

// A simple "is the server alive" check — visit this URL in a browser to test.
app.get('/', (req, res) => {
  res.send('SIH registration backend is running.');
});

// Mount each route file at a URL prefix.
app.use('/api/register', registerRoute);
app.use('/api/registrations', checkRoute);
app.use('/api/export', exportRoute);
app.use('/api/admin', adminStatsRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});