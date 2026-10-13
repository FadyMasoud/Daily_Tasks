// Long-running server (local dev / Render). On Vercel, api/index.js uses app.js directly
// and the scheduled jobs are triggered by Vercel Cron instead of node-cron.
const path = require('path');
const express = require('express');
const app = require('./app');

require('./cron/scheduler');

const PORT = process.env.PORT || 5000;

// Serve React app in production (Express serves the Vite build)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
