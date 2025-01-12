// pages/api/inbox/messages/[id].ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { pool } from '../../../../lib/db';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid conversation ID' });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM messages 
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `, [id]);

    return res.status(200).json({
      messages: result.rows
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
}