import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const VAPI_TOKEN = process.env.VAPI_TOKEN;
const VAPI_BASE_URL = 'https://api.vapi.ai';

const assistantConfig = {
  name: "Integrity Housing Assistant",
  model: {
    provider: "openai",
    model: "gpt-4",
    temperature: 0.7,
    functions: [
      {
        name: "see_listings",
        description: "Retrieve available properties for specific dates",
        parameters: {
          type: "object",
          properties: {
            checkInDate: {
              type: "string",
              description: "Check-in date in YYYY-MM-DD format"
            },
            checkOutDate: {
              type: "string", 
              description: "Check-out date in YYYY-MM-DD format"
            },
            guestsCount: {
              type: "number",
              description: "Number of guests"
            }
          },
          required: ["checkInDate", "checkOutDate"]
        }
      },
      {
        name: "user_wants_to_book",
        description: "Generate a booking quote and trigger booking flow",
        parameters: {
          type: "object",
          properties: {
            listingId: {
              type: "string",
              description: "ID of the selected listing"
            },
            checkInDate: {
              type: "string",
              description: "Check-in date in YYYY-MM-DD format"
            },
            checkOutDate: {
              type: "string",
              description: "Check-out date in YYYY-MM-DD format"
            },
            guestsCount: {
              type: "number",
              description: "Number of guests"
            },
            email: {
              type: "string",
              description: "Guest's email address"
            }
          },
          required: ["listingId", "checkInDate", "checkOutDate", "email"]
        }
      }
    ],
    messages: [
      {
        role: "system",
        content: `${process.env.ASSISTANT_PROMPT}` // Your existing prompt here
      }
    ]
  },
  voice: {
    provider: "11labs",
    voiceId: "rachel"
  },
  firstMessage: "Hi! I'm your Integrity Corporate Housing assistant. I'm here to help you find the perfect property for your stay! 🏠",
  serverUrl: `${process.env.VERCEL_URL}/api/vapi/functions`
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await axios.post(
      `${VAPI_BASE_URL}/assistant`,
      assistantConfig,
      {
        headers: {
          'Authorization': `Bearer ${VAPI_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error creating VAPI assistant:', error);
    res.status(500).json({ error: 'Failed to create assistant' });
  }
}