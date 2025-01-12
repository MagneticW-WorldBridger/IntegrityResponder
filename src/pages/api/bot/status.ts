import { VercelRequest, VercelResponse } from '@vercel/node';
import { pool } from '../../../lib/db';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { conversationId } = req.query;
  if (!conversationId || Array.isArray(conversationId)) {
    return res.status(400).json({ error: 'conversationId is required' });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT is_active FROM bot_settings WHERE conversation_id = $1',
      [conversationId]
    );
    
    // Si no hay registro, asumimos que está activo
    const is_active = result.rows[0]?.is_active ?? true;

    return res.status(200).json({ is_active });
  } catch (error) {
    console.error('Error getting bot state:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}