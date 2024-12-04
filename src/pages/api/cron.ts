import { refreshGuestyToken } from './token/refresh';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest, 
  res: VercelResponse
) {
  try {
    const tokenData = await refreshGuestyToken();
    res.status(200).json({ success: true, ...tokenData });
  } catch (error) {
    res.status(500).json({ 
      error: 'Token refresh failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}