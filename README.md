# Lead Generation API

Express API server for handling Make.com webhook callbacks and saving results to Firestore.

## Setup

1. Navigate to the api directory:
```bash
cd api
```

2. Install dependencies:
```bash
npm install
```

3. Get your Firebase service account key:
   - Go to Firebase Console > Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Download the JSON file and place it in the `api` directory

4. Update `server.js` line 10 with your service account filename:
```javascript
const serviceAccountPath = join(__dirname, 'your-project-firebase-adminsdk-xxxxx.json');
```

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:3001` by default.

## API Endpoints

### POST /api/save-results

Receives results from Make.com and saves to Firestore.

**Request Body:**
```json
{
  "submission_id": "abc123",
  "user_id": "user123",
  "company_info": {
    "company_name": "Example Corp",
    "industry": "Technology",
    "value_props": "AI-powered solutions",
    "pain_points": "Manual processes"
  },
  "apollo_filters": [
    { "type": "industry", "value": "Technology" },
    { "type": "company_size", "value": "50-200" }
  ],
  "leads": [
    {
      "name": "John Doe",
      "title": "CEO",
      "company": "Example Corp",
      "email": "john@example.com",
      "linkedin": "https://linkedin.com/in/johndoe",
      "icp_score": 85,
      "status": "new"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "company_info_id": "doc123",
  "leads_count": 1
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Make.com Integration

Configure your Make.com scenario to send a POST request to:
```
http://your-server-url:3001/api/save-results
```

Include all required fields in the request body as shown above.

## Deployment

For production deployment, consider:
- Using a process manager like PM2
- Setting up environment variables on your hosting platform
- Enabling HTTPS
- Adding rate limiting and authentication
- Using a reverse proxy like Nginx

Example with PM2:
```bash
npm install -g pm2
pm2 start server.js --name lead-gen-api
pm2 save
pm2 startup
```
