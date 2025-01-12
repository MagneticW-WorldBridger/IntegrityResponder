import { VercelRequest, VercelResponse } from '@vercel/node';
import { pool } from '../../../lib/db';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = await pool.connect();
  try {
    const { listing_id } = req.body;

    if (!listing_id) {
      return res.status(400).json({ error: 'listing_id is required' });
    }

    const result = await client.query(
      `SELECT 
        listing_id,
        title,
        address,
        neighborhood,
        zip_code,
        description_space,
        description_access,
        description_neighborhood,
        description_transit,
        description_notes,
        description_interaction,
        created_at
      FROM properties 
      WHERE listing_id = $1
      LIMIT 1`,
      [listing_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    return res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching property:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
} 