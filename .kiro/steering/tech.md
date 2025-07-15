# Technology Stack

## Architecture
- **Monorepo Structure**: Client and server as separate packages
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: Drizzle ORM (configured for PostgreSQL/Neon)
- **Routing**: Wouter (lightweight React router)
- **State Management**: Zustand + React Query

## Frontend Stack
- **Build Tool**: Vite with React plugin
- **Styling**: Tailwind CSS + Radix UI components
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **PWA**: Service worker + offline support
- **Storage**: IndexedDB (via idb library)

## Backend Stack
- **Runtime**: Node.js with ts-node for development
- **Framework**: Express.js with CORS
- **Authentication**: JWT + bcrypt
- **AI Integration**: Multiple providers (OpenAI, Anthropic, Grok/xAI)
- **External Services**: Twilio (SMS), Stripe (payments), SendGrid (email)

## Development Tools
- **TypeScript**: Strict mode enabled across all packages
- **ESLint**: Code linting with React-specific rules
- **Path Aliases**: `@/` for client src, `@shared/` for shared types

## Common Commands

### Development
```bash
# Start backend server
cd server && npm run dev

# Start frontend client  
cd client && npm run dev

# Alternative server commands
npm run working    # working-server.ts
npm run full      # index.ts (full feature set)
npm run test      # simple-server.ts
```

### Build & Deploy
```bash
# Build client for production
cd client && npm run build

# Preview production build
cd client && npm run preview

# Lint client code
cd client && npm run lint
```

## Key Dependencies
- **UI**: @radix-ui/* components, lucide-react icons
- **Data Fetching**: @tanstack/react-query
- **Validation**: zod schemas
- **Date Handling**: date-fns
- **Carousel**: embla-carousel-react
- **Markdown**: react-markdown