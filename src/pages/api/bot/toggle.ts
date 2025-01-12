import { VercelRequest, VercelResponse } from '@vercel/node';
import { pool } from '../../../lib/db';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Add conversation ID validation
  const { conversationId } = req.body;
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId is required' });
  }

  const client = await pool.connect();
  try {
    // Updated query to filter by conversation_id
    const currentState = await client.query(
      'SELECT is_active FROM bot_settings WHERE conversation_id = $1',
      [conversationId]
    );
    
    const newState = !(currentState.rows[0]?.is_active ?? true);
    
    // Updated insert to handle conversation_id and use UPSERT
    await client.query(
      `INSERT INTO bot_settings (conversation_id, is_active) 
       VALUES ($1, $2)
       ON CONFLICT (conversation_id) 
       DO UPDATE SET is_active = $2, updated_at = CURRENT_TIMESTAMP`,
      [conversationId, newState]
    );

    return res.status(200).json({ is_active: newState });
  } catch (error) {
    console.error('Error toggling bot state:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}