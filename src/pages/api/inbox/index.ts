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
    console.log('Attempting database connection...');
    
    // Get latest 50 conversations with their latest message
    const result = await client.query(`
      WITH last_messages AS (
        SELECT 
          conversation_id,
          content as last_message,
          created_at as last_message_at
        FROM messages
        WHERE (conversation_id, created_at) IN (
          SELECT conversation_id, MAX(created_at)
          FROM messages
          GROUP BY conversation_id
        )
      )
      SELECT 
        c.*,
        COUNT(m.id) as message_count,
        COUNT(CASE WHEN m.is_automated THEN 1 END) as automated_count,
        COUNT(CASE WHEN NOT m.is_read THEN 1 END) as unread_count,
        lm.last_message,
        lm.last_message_at
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      LEFT JOIN last_messages lm ON c.id = lm.conversation_id
      GROUP BY c.id, lm.last_message, lm.last_message_at
      ORDER BY lm.last_message_at DESC NULLS LAST
      LIMIT 50
    `);

    console.log(`Found ${result.rows.length} conversations`);
    
    return res.status(200).json({
      conversations: result.rows
    });

  } catch (error) {
    console.error('Detailed error in /api/inbox:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch conversations',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    client.release();
  }
}