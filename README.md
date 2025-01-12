# Integrity Corporate Housing Assistant

## Overview
An automated vacation rental management system that provides intelligent responses to client inquiries through Airbnb messaging. The system leverages AI to handle property inquiries, availability checks, and general FAQs, providing seamless customer service 24/7.

## System Architecture

### Core Components
1. **Next.js Frontend & API Layer**
   - Inbox management interface
   - API endpoints for property information
   - Token management for Guesty integration
   - Bot control endpoints

2. **n8n Workflow (Workflow-25)**
   - Handles incoming message webhooks
   - Processes Airbnb messages
   - Manages conversation flow
   - Integrates with OpenAI for intelligent responses
   - Checks property availability
   - Sends automated responses

3. **Database (PostgreSQL)**
   - Tables:
     - `bot_settings`: Controls bot activation status
     - `properties`: Stores property information
     - `tool_call_listings`: Tracks API calls
     - `messages`: Stores conversation messages
     - `conversations`: Manages conversation threads

### Integrations
- **Guesty API**: Property management and booking
- **OpenAI**: Intelligent message processing
- **VAPI.ai**: Voice capabilities
- **Airbnb Platform**: Message source

## Message Processing Flow

1. **Trigger**
   - Client sends message through Airbnb
   - Webhook receives message

2. **Processing**
   - System checks if message is from Airbnb
   - Validates message type and platform
   - Extracts relevant information (dates, inquiries, etc.)

3. **Decision Tree**
   - Classifies message intent:
     - Property Information Requests
     - Availability Checks
     - General FAQ Questions

4. **Response Generation**
   - Fetches relevant property information
   - Checks availability if requested
   - Generates appropriate response using OpenAI
   - Formats and sends response back through Airbnb

## Features

- **Automated Response System**
  - Intelligent message classification
  - Context-aware responses
  - Property availability checking
  - FAQ handling

- **Property Management**
  - Property information retrieval
  - Availability tracking
  - Booking information handling

- **Admin Interface**
  - Message inbox monitoring
  - Bot activation/deactivation
  - Conversation management

## API Endpoints

### Property Management
- `POST /api/properties/get-property`
  - Retrieves property information

### Bot Control
- `POST /api/bot/toggle`
  - Enables/disables bot for specific conversations

### Token Management
- `GET /api/token/current`
  - Retrieves current Guesty token
- `POST /api/token/refresh`
  - Refreshes Guesty authentication token

### Inbox Management
- `GET /api/inbox`
  - Retrieves conversation list
- `POST /api/inbox/{id}/read`
  - Marks conversations as read

## Deployment

The application is deployed on Vercel with automatic deployments from the main branch.

### Cron Jobs
- Daily token refresh at 8:00 AM (configured in vercel.json)

## Database Schema

## Maintenance

### Regular Tasks
- Monitor token refresh logs
- Check conversation response accuracy
- Review bot performance metrics
- Update property information as needed

### Troubleshooting
- Check webhook logs for message processing issues
- Verify token validity for API authentication
- Monitor OpenAI response generation
- Review database connection status

## Support

For issues or questions:
1. Check webhook logs in n8n
2. Verify database connectivity
3. Confirm API token validity
4. Review OpenAI response logs
