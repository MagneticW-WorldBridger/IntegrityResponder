// src/pages/api/vapi/functions.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import { pool } from '../../../lib/db';
import axios, { AxiosResponse } from 'axios';

// Interface for cleaned listing data
interface CleanListing {
  id: string;
  title: string;
  basePrice: number;
  cleaningFee: number;
  petFee: number;
  images: {
    regular: string;
    thumbnail: string;
  };
  description: {
    summary: string;
    space: string;
    access: string;
    neighborhood: string;
    transit: string;
    notes: string;
  };
  beds: number;
  bathrooms: number;
  accommodates: number;
  address: string;
  amenities: string[];
  minNights: number;
  maxNights: number;
  externalUrl: string;
}

// Interfaces for request parameters
interface SeeListingsParams {
  checkInDate: string;
  checkOutDate: string;
  guestsCount?: number;
}

interface UserWantsToBookParams {
  listingId: string;
  checkInDate: string;
  checkOutDate: string;
  guestsCount: number;
  email: string;
}

type ApiRequestBody =
  | { name: 'see_listings'; parameters: SeeListingsParams }
  | { name: 'user_wants_to_book'; parameters: UserWantsToBookParams };

// Function to sanitize raw listing data
function cleanListing(rawListing: any): CleanListing {
  return {
    id: rawListing._id,
    title: rawListing.title || '',
    basePrice: rawListing.prices?.basePrice || 0,
    cleaningFee: rawListing.prices?.cleaningFee || 0,
    petFee: rawListing.prices?.petFee || 0,
    images: {
      regular: rawListing.picture?.regular || '',
      thumbnail: rawListing.picture?.thumbnail || '',
    },
    description: {
      summary: rawListing.publicDescription?.summary || '',
      space: rawListing.publicDescription?.space || '',
      access: rawListing.publicDescription?.access || '',
      neighborhood: rawListing.publicDescription?.neighborhood || '',
      transit: rawListing.publicDescription?.transit || '',
      notes: rawListing.publicDescription?.notes || '',
    },
    beds: rawListing.beds || 0,
    bathrooms: rawListing.bathrooms || 0,
    accommodates: rawListing.accommodates || 0,
    address: rawListing.address?.full || '',
    amenities: rawListing.amenities || [],
    minNights: rawListing.terms?.minNights || 1,
    maxNights: rawListing.terms?.maxNights || 365,
    externalUrl: rawListing.integrations?.[0]?.externalUrl || '',
  };
}

// Function to retrieve the latest Guesty token from the database
async function getGuestyToken(): Promise<string> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT token FROM auth_tokens ORDER BY created_at DESC LIMIT 1'
    );
    if (result.rows.length === 0) {
      throw new Error('No valid token found');
    }
    return result.rows[0].token;
  } finally {
    client.release();
  }
}

// Function to check availability of listings on Guesty
async function checkGuestyAvailability(
  token: string,
  params: SeeListingsParams
): Promise<CleanListing[]> {
  // Base request parameters
  const requestParams: any = {
    active: true,
    pmsActive: true,
    listed: true,
    limit: 25,
    skip: 0,
  };

  // Add availability filters if provided
  if (params.checkInDate && params.checkOutDate) {
    requestParams.available = {
      checkIn: params.checkInDate,
      checkOut: params.checkOutDate,
    };
    if (params.guestsCount) {
      requestParams.available.minOccupancy = params.guestsCount;
    }
  }

  // Log the request parameters for debugging
  console.log('Requesting Guesty with params:', JSON.stringify(requestParams, null, 2));

  try {
    const response: AxiosResponse<any> = await axios.get(
      'https://open-api.guesty.com/v1/listings',
      {
        params: requestParams,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        paramsSerializer: (params) => {
          return Object.entries(params)
            .map(([key, value]) => {
              if (typeof value === 'object') {
                return `${key}=${encodeURIComponent(JSON.stringify(value))}`;
              }
              return `${key}=${encodeURIComponent(String(value))}`;
            })
            .join('&');
        },
      }
    );

    const cleanListings: CleanListing[] = response.data.results.map(cleanListing);
    console.log(`Found ${cleanListings.length} available listings`);

    return cleanListings;
  } catch (error: any) {
    console.error('Error checking Guesty availability:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 'Failed to fetch availability from Guesty'
    );
  }
}

// Function to create a quote on Guesty
async function createGuestyQuote(
  token: string,
  params: UserWantsToBookParams
): Promise<any> {
  const {
    listingId,
    checkInDate,
    checkOutDate,
    guestsCount,
    email,
  } = params;

  const payload = {
    listingId,
    checkInDateLocalized: checkInDate,
    checkOutDateLocalized: checkOutDate,
    guestsCount,
    source: 'manual_reservations',
    email,
  };

  try {
    const response: AxiosResponse<any> = await axios.post(
      'https://open-api.guesty.com/v1/quotes',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Quote created successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error creating Guesty quote:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 'Failed to create quote on Guesty'
    );
  }
}

// Main handler function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body: ApiRequestBody;

  // Validate and parse request body
  try {
    body = req.body;
    if (!body || typeof body !== 'object') {
      throw new Error('Invalid request body');
    }
    if (!body.name || !body.parameters) {
      throw new Error('Missing "name" or "parameters" in request body');
    }
  } catch (err: any) {
    console.error('Invalid request:', err.message);
    return res.status(400).json({ error: 'Invalid request format', details: err.message });
  }

  try {
    const token = await getGuestyToken();

    switch (body.name) {
      case 'see_listings':
        {
          const params = body.parameters as SeeListingsParams;

          // Validate required parameters
          if (!params.checkInDate || !params.checkOutDate) {
            return res.status(400).json({
              error: 'Missing required parameters: checkInDate and checkOutDate',
            });
          }

          const listings = await checkGuestyAvailability(token, params);
          return res.status(200).json({ listings });
        }

      case 'user_wants_to_book':
        {
          const params = body.parameters as UserWantsToBookParams;

          // Validate required parameters
          const requiredFields = ['listingId', 'checkInDate', 'checkOutDate', 'guestsCount', 'email'];
          const missingFields = requiredFields.filter(field => !(field in params));
          if (missingFields.length > 0) {
            return res.status(400).json({
              error: `Missing required parameters: ${missingFields.join(', ')}`,
            });
          }

          const quote = await createGuestyQuote(token, params);
          return res.status(200).json({ quote });
        }

      default:
        return res.status(400).json({ error: 'Unknown function name' });
    }
  } catch (error: any) {
    console.error('Handler error:', error.message);
    return res.status(500).json({
      error: 'Function execution failed',
      details: error.message,
    });
  }
}