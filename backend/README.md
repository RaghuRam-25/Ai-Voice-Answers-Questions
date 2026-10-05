# AI Voice Assistant — Backend

Node.js + Express + TypeScript backend for the AI Voice Assistant.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Copy `.env` and update values:
   - `MONGODB_URI` — your MongoDB connection string
   - `JWT_SECRET` — a long random secret key
   - `AI_API_KEY` — your AI provider API key (Gemini)

3. **Start MongoDB:**
   Make sure MongoDB is running locally or provide a remote URI.

4. **Run in development:**
   ```bash
   npm run dev
   ```

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/logout` | No | Logout |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/assistant/status` | Yes | Assistant state |
| POST | `/api/assistant/message` | Yes | Send message |
| GET | `/api/conversations` | Yes | List conversations |
| GET | `/api/conversations/:id` | Yes | Get conversation |
| DELETE | `/api/conversations/:id` | Yes | Delete conversation |
| GET | `/api/settings` | Yes | Get settings |
| PATCH | `/api/settings` | Yes | Update settings |

## Architecture

```
backend/src/
├── config/          # Environment, DB, CORS configuration
├── routes/          # URL endpoints → controllers
├── controllers/     # Request handling → services
├── services/        # Business logic (AI, assistant, commands)
├── ai/              # AI provider, prompts, tools
├── models/          # MongoDB/Mongoose schemas
├── middleware/       # Auth, validation, error handling, rate limiting
├── socket/          # Socket.IO realtime events
├── validators/      # Zod request schemas
├── utils/           # Logger, error classes
└── types/           # TypeScript interfaces
```
