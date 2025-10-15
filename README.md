# Ambassador Tracking Backend

Backend API for the Ambassador Tracking system.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your configuration (see `.env.example`)

3. Set up Instagram webhooks:
   - Follow the [Instagram Webhook Setup Guide](src/instagram-webhook/SETUP-GUIDE.md)
   - Check the [Instagram Webhook README](src/instagram-webhook/README.md) for technical details

4. Run database migrations:
   ```bash
   npm run typeorm migration:run
   ```

5. Start the development server:
   ```bash
   npm run start:dev
   ```

## Available Scripts

- `npm run start`: Start the application
- `npm run start:dev`: Start the application in development mode
- `npm run start:debug`: Start the application in debug mode
- `npm run build`: Build the application
- `setup-webhooks`: Set up Instagram webhook subscriptions
- `check-webhooks`: Check current Instagram webhook subscriptions
- `refresh-token`: Refresh Instagram access token

## Instagram Integration

The system integrates with Instagram to track ambassador activities:
- Mentions in posts, stories, and reels
- Tags in posts and stories
- Story mentions

For detailed setup instructions, see:
- [Instagram Webhook Setup Guide](src/instagram-webhook/SETUP-GUIDE.md)
- [Instagram Webhook Technical Documentation](src/instagram-webhook/README.md)

## API Documentation

API documentation is available at `/docs` when the server is running.

## Testing

Run tests with:
```bash
npm run test
```

Run tests in watch mode:
```bash
npm run test:watch
```