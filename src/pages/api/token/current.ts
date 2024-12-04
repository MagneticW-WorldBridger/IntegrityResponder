import { VercelRequest, VercelResponse } from '@vercel/node';
import { pool } from '../../../lib/db';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT token, expires_at FROM auth_tokens ORDER BY created_at DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No token found' });
    }

    // Check if token is expired
    const expires_at = new Date(result.rows[0].expires_at);
    if (expires_at < new Date()) {
      return res.status(403).json({ error: 'Token expired' });
    }

    res.status(200).json({ token: result.rows[0].token });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve token',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
}