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

// Utility function to clean raw listing data
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

// Function to store toolCallId and associated listings in the database
async function storeToolCallListings(toolCallId: string, listings: CleanListing[]): Promise<void> {
  const client = await pool.connect();
  try {
    const insertQuery = `
      INSERT INTO tool_call_listings (tool_call_id, listing_id, title)
      VALUES ($1, $2, $3)
      ON CONFLICT (tool_call_id, listing_id) DO NOTHING
    `;
    for (const listing of listings) {
      await client.query(insertQuery, [toolCallId, listing.id, listing.title]);
    }
  } catch (error) {
    console.error('Error storing tool call listings:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to get the latest Guesty token by calling your existing endpoint
async function getGuestyToken(): Promise<string> {
  try {
    const response = await axios.get('https://integritycorporatehousing.vercel.app/api/token/current');
    return response.data.token;
  } catch (error) {
    console.error('Error retrieving Guesty token:', error);
    throw new Error('Failed to retrieve Guesty token');
  }
}

// Function to check availability on Guesty
async function checkGuestyAvailability(
  token: string,
  params: {
    checkInDate: string;
    checkOutDate: string;
    guestsCount?: number;
  }
): Promise<CleanListing[]> {
  const requestParams: any = {
    active: true,
    pmsActive: true,
    listed: true,
    limit: 25,
    skip: 0,
  };

  if (params.checkInDate && params.checkOutDate) {
    requestParams.available = {
      checkIn: params.checkInDate,
      checkOut: params.checkOutDate,
    };
    if (params.guestsCount) {
      requestParams.available.minOccupancy = params.guestsCount;
    }
  }

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
  params: {
    listingId: string;
    checkInDate: string;
    checkOutDate: string;
    guestsCount: number;
    email: string;
  }
): Promise<any> {
  const payload = {
    listingId: params.listingId,
    checkInDateLocalized: params.checkInDate,
    checkOutDateLocalized: params.checkOutDate,
    guestsCount: params.guestsCount,
    source: 'manual_reservations',
    email: params.email,
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

  try {
    // Parse the VAPI message
    const vapiMessage = req.body.message;
    if (!vapiMessage || !vapiMessage.toolCalls || vapiMessage.toolCalls.length === 0) {
      return res.status(400).json({ error: 'Invalid request format: Missing toolCalls' });
    }

    const toolCall = vapiMessage.toolCalls[0];
    const toolCallId = toolCall.id;
    const functionCall = toolCall.function;

    if (!functionCall || !functionCall.name || !functionCall.arguments) {
      return res.status(400).json({ error: 'Invalid request format: Missing function details' });
    }

    const functionName = functionCall.name;
    const functionArguments = functionCall.arguments;

    // Parse the arguments string into an object
    let parameters: any;
    try {
      parameters = JSON.parse(functionArguments);
    } catch (err: any) {
      console.error('Invalid function arguments JSON:', err.message);
      return res.status(400).json({ error: 'Invalid function arguments JSON' });
    }

    const token = await getGuestyToken();

    let result: any;

    switch (functionName) {
      case 'see_listings':
        {
          const availableParams = parameters.available;
          if (!availableParams || !availableParams.check_in || !availableParams.check_out) {
            return res.status(400).json({
              error: 'Missing required parameters: available.check_in and available.check_out',
            });
          }

          const params = {
            checkInDate: availableParams.check_in,
            checkOutDate: availableParams.check_out,
            guestsCount: availableParams.min_occupancy,
          };

          const listings = await checkGuestyAvailability(token, params);

          // Store the toolCallId and associated listings in the database
          await storeToolCallListings(toolCallId, listings);

          // Prepare a concise, flat string result with listing IDs and titles
          if (listings.length === 0) {
            result = 'No listings are available for the selected dates.';
          } else {
            // Build a simple string listing IDs and titles
            const listingDescriptions = listings.map((listing, index) => {
              return `${index + 1}. (ID: ${listing.id}) ${listing.title}`;
            }).join('; ');
            result = `Available listings: ${listingDescriptions}`;
          }
        }
        break;

      case 'user_wants_to_book':
        {
          const { listingId, checkInDate, checkOutDate, guestsCount, email } = parameters;

          // Validate required parameters
          const requiredFields = ['listingId', 'checkInDate', 'checkOutDate', 'guestsCount', 'email'];
          const missingFields = requiredFields.filter((field) => !(field in parameters));
          if (missingFields.length > 0) {
            return res.status(400).json({
              error: `Missing required parameters: ${missingFields.join(', ')}`,
            });
          }

          // Get the quote from Guesty
          const quote = await createGuestyQuote(token, {
            listingId,
            checkInDate,
            checkOutDate,
            guestsCount,
            email,
          });

          // Pass the Guesty response directly
          result = quote;
        }
        break;

      default:
        return res.status(400).json({ error: 'Unknown function name' });
    }

    // Return the response in the required format
    return res.status(200).json({
      results: [
        {
          toolCallId: toolCallId,
          result: result,
        },
      ],
    });
  } catch (error: any) {
    console.error('Handler error:', error.message);
    return res.status(500).json({
      error: 'Function execution failed',
      details: error.message,
    });
  }
}