import { VercelRequest, VercelResponse } from '@vercel/node';
import { pool } from '../../../../lib/db';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid conversation ID' });
  }

  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE messages 
      SET is_read = true 
      WHERE conversation_id = $1 AND is_read = false
    `, [id]);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ 
      error: 'Failed to mark messages as read',
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  } finally {
    client.release();
  }
}
