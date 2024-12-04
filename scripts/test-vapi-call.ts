import axios from 'axios';

const VAPI_TOKEN = process.env.VAPI_TOKEN;
const ASSISTANT_ID = 'YOUR_ASSISTANT_ID'; // You'll get this from step 1

async function testCall() {
  try {
    // Create a test call
    const response = await axios.post('https://api.vapi.ai/call', {
      assistantId: ASSISTANT_ID,
      phoneNumber: "+1234567890", // Your test phone number
    }, {
      headers: {
        'Authorization': `Bearer ${VAPI_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Call created:', response.data);
  } catch (error) {
    console.error('Error creating call:', error);
  }
}

testCall();