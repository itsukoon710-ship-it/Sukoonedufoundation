import app from '../dist/server.js';

export default async function handler(req, res) {
  try {
    return await app(req, res);
  } catch (err) {
    console.error('API handler error:', err);
    res.status(503).json({ error: 'Server unavailable' });
  }
}
