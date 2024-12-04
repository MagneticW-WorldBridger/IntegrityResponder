import axios from 'axios';

const VAPI_TOKEN = process.env.VAPI_TOKEN;

async function createAssistant() {
  try {
    const response = await axios.post(
      'https://api.vapi.ai/assistant',
      {
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
          ]
        },
        voice: {
          provider: "11labs",
          voiceId: "rachel"
        },
        firstMessage: "Hi! I'm your Integrity Corporate Housing assistant. I'm here to help you find the perfect property for your stay! 🏠",
        serverUrl: "YOUR_DEPLOYED_URL/api/vapi/functions"
      },
      {
        headers: {
          'Authorization': `Bearer ${VAPI_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Assistant created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating assistant:', error);
    throw error;
  }
}

createAssistant();