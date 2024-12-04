import { VercelRequest, VercelResponse } from '@vercel/node';
import { pool } from '../../../lib/db';
import axios from 'axios';

export async function refreshGuestyToken() {
  try {
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('scope', 'open-api');
    formData.append('client_secret', 'V5p55fFP9j1UfiFpKe33LP1GBbnru8J5Cwotg5XSxXnMOTgPcs-a837nXcs1SeQu');
    formData.append('client_id', '0oakfu42a3dK5b10l5d7');

    const response = await axios.post('https://open-api.guesty.com/oauth2/token', 
      formData.toString(),
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, expires_in, token_type } = response.data;
    const expires_at = new Date(Date.now() + expires_in * 1000);

    const client = await pool.connect();
    try {
      await client.query('DELETE FROM auth_tokens');
      await client.query(
        'INSERT INTO auth_tokens (token, expires_at) VALUES ($1, $2)',
        [access_token, expires_at]
      );
    } finally {
      client.release();
    }

    return { access_token, token_type };
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tokenData = await refreshGuestyToken();
    res.status(200).json({
      success: true,
      ...tokenData
    });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ 
      error: 'Token refresh failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}