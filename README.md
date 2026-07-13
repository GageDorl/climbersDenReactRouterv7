# climbersDen - Social Network for Rock Climbers

A comprehensive mobile-first web application for rock climbers combining social networking with climbing-specific features.

## 🎯 Features

### MVP (Phase 1 & 2)
- **User Authentication & Profiles**: Registration, login, profile setup with climbing experience
- **Social Feed**: Create posts with photos/videos, like and comment on community content

### Phase 2 Features
- **Private Messaging**: 1:1 messaging with media sharing
- **User Discovery**: Find and follow climbers by location, style, and experience
- **Crag & Route Database**: Browse climbing areas with weather forecasts and interactive maps
- **Tick Lists**: Log your route ascents and track climbing progress
- **Group Coordination**: Real-time group chats for trip planning
- **Gear Lists**: Collaborative gear coordination for climbing trips

### Phase 3 Features (not yet built)
- **Offline Journals**: `Journal` exists as a Prisma model, but there are no routes, components, or Dexie.js sync logic yet. `dexie` and `workbox-window` are installed but unused.

## 🚀 Quick Start

### Prerequisites

- Node.js 20 LTS or higher
- PostgreSQL 15+
- npm or pnpm

### Installation

1. **Install dependencies** (already done)
   ```bash
   npm install
   ```

2. **Set up environment variables**
   
   Edit `.env` file and fill in your values:
   
   Required variables:
   - `DATABASE_URL`: PostgreSQL connection string (default: `postgresql://postgres:postgres@localhost:5432/climbersden_dev`)
   - `SESSION_SECRET`: Random string for session encryption (generate with `openssl rand -base64 32`)
   - `CLOUDINARY_*`: Get free account at [cloudinary.com](https://cloudinary.com)
   - `MAPBOX_ACCESS_TOKEN`: Get free account (50k loads/month) at [mapbox.com](https://mapbox.com)
   - `OPENWEATHER_API_KEY`: Get free key at [openweathermap.org](https://openweathermap.org/api)
   - `SMTP_*` / `EMAIL_FROM`: Password reset emails; use [Mailtrap](https://mailtrap.io) for dev

   Optional variables:
   - `OPENBETA_API_URL`: Public OpenBeta GraphQL API for crag/route data — no key required, defaults to `https://api.openbeta.io/`
   - `REDIS_URL`: Only needed if scaling Socket.IO across multiple instances

3. **Create database**
   ```bash
   # Windows (using psql)
   psql -U postgres -c "CREATE DATABASE climbersden_dev;"
   
   # Or using createdb command
   createdb climbersden_dev
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
app/
├── routes/              # React Router v7 routes (file-based routing)
│   ├── _index.tsx      # Landing page
│   ├── auth.*.tsx      # Authentication routes
│   ├── posts.*.tsx     # Social feed routes
│   ├── messages.*.tsx  # Messaging routes
│   ├── crags.*.tsx     # Crag discovery routes
│   └── ...
├── lib/                 # Server-side utilities
│   ├── auth.server.ts  # Authentication & session management
│   ├── db.server.ts    # Prisma client singleton
│   ├── cloudinary.server.ts  # Media upload utilities
│   ├── email.server.ts # Password reset emails (SMTP)
│   ├── openbeta.server.ts  # OpenBeta GraphQL client (crag/route data)
│   ├── weather.server.ts   # OpenWeatherMap client
│   ├── realtime.server.ts # Socket.IO server setup
│   ├── geo-utils.ts    # Geolocation & distance calculations
│   └── validation.ts   # Zod validation schemas
├── components/          # React components
│   ├── ui/             # Base UI components (Radix UI)
│   ├── posts/          # Social feed components
│   ├── messages/       # Messaging components
│   ├── crags/          # Crag & route components
│   ├── gear/, ticks/, discovery/, location/, search/, weather/, profile/
│   └── ...
│   # Note: there are no dedicated auth/ or groups/ folders — that UI
│   # lives inline in the corresponding route files.
├── hooks/               # Custom React hooks (8 total), including
│   │                    # use-geolocation, use-socket, use-infinite-scroll,
│   │                    # use-background-location, use-haptic-feedback
│   └── ...
├── types/               # TypeScript type definitions
│   ├── db.ts           # Prisma types & custom interfaces
│   └── realtime.ts     # Socket.IO event types
└── app.css             # Global styles (Tailwind)

prisma/
└── schema.prisma       # Database schema (25 entities)

tests/
└── setup.ts            # Vitest setup only — no test files exist yet
                         # despite vitest/Playwright being configured
                         # (see Testing section below)
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm test` - Run unit tests with Vitest
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:e2e:ui` - Run E2E tests in UI mode
- `npm run db:migrate` - Run Prisma migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Seed database with sample data

## 🧪 Testing

**Status: not yet started.** Vitest and Playwright are fully configured
(`vitest.config.ts` sets an 80% coverage threshold; `playwright.config.ts`
exists), but there are no test files in the repo yet beyond
`tests/setup.ts`. The commands below will run, they just won't find
anything to test until suites are written.

### Unit & Integration Tests (Vitest)
```bash
npm test
```

### End-to-End Tests (Playwright)
```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui
```

### Test Coverage
```bash
npm run test:coverage
```

Configured minimum coverage threshold: **80%** for branches, functions, lines, and statements (not currently met — see above).

## 🌐 Tech Stack

### Frontend
- **React 19** - UI library
- **React Router v7** - Fullstack framework with SSR
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Mapbox GL JS** - Interactive maps
- **Dexie.js** - Installed for future offline-journal sync (IndexedDB); not yet wired up to any route or component

### Backend
- **Node.js** - JavaScript runtime
- **Prisma** - Type-safe ORM
- **PostgreSQL 15+** - Relational database
- **Socket.IO** - Real-time WebSocket communication
- **Cloudinary** - Media storage and CDN
- **bcryptjs** - Password hashing
- **Zod** - Runtime type validation
- **OpenBeta GraphQL API** - Public crag/route data source (no API key required)

### Testing
- **Vitest** - Unit and integration testing
- **Playwright** - End-to-end testing
- **React Testing Library** - Component testing
- **MSW** - API mocking

## 📊 Database Schema

The application uses 25 PostgreSQL entities:

**User Management**: User, NotificationPreference, Follow, Block, Notification, Report, PasswordResetToken

**Social Features**: Post, Comment, Like, Message, Conversation, GroupChat, GroupMessage, GroupChatParticipant

**Climbing Data**: Crag, Route, Tick, RouteRating, FavoriteCrag, WeatherForecast

**Trip Planning**: GearList, GearItem, Journal, CragSubmission

`Journal` currently has no application code built on top of it (see Phase 3 note above).

See `prisma/schema.prisma` for full schema definition.

## 🔒 Security

- **Password Security**: bcrypt hashing with 10 rounds
- **Session Management**: Encrypted HTTP-only cookies
- **Input Validation**: Zod schemas for all user inputs
- **CSRF Protection**: SameSite cookies
- **Content Moderation**: Report and block functionality
- **Location Privacy**: Optional GPS with 4-decimal precision (~11m accuracy)

## ♿ Accessibility

- **WCAG 2.1 Level AA** compliant
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and semantic HTML
- **Touch Targets**: Minimum 44x44px for mobile
- **Color Contrast**: Meets AA standards

## 📈 Performance

- **Target Metrics**:
  - Feed load: <2s on 4G
  - Message delivery: <1s
  - Image uploads: <5s
  - p95 loader responses: <200ms

- **Optimizations**:
  - React Router SSR for fast initial load
  - Automatic code splitting per route
  - Image CDN with transformations (Cloudinary)
  - Database query optimization with Prisma
  - Cursor-based pagination for feeds

## 🚧 Development Roadmap

### ✅ Completed
- [x] Project setup and configuration
- [x] Database schema with 25 entities
- [x] Authentication infrastructure
- [x] Foundational utilities (auth, db, validation, geolocation)
- [x] Development environment configured
 - [x] Social feed (posts, likes, comments) with post creation and previews
 - [x] Post interactions: like, comment, replies, and moderation endpoints
 - [x] User profiles and follow/unfollow flows
 - [x] Private messaging UI (conversations, messages, new message flow)
 - [x] Crag & route browsing, favorites, and nearby discovery endpoints
 - [x] Route ticks: create, view, edit, share, and stats pages
 - [x] Gear lists: create, edit, share, participants, and item actions
 - [x] Notifications: in-app notification UI and API endpoints
 - [x] Groups: create, join/leave, group settings and real-time group flows
 - [x] File upload signing and Cloudinary integration helpers
 - [x] Admin reports UI and report handling endpoints
 - [x] Password reset flow (request + token-based reset, email via SMTP) — fully implemented, not just scaffolded

### 🔄 Next Steps
- [ ] Initialize PostgreSQL database
- [ ] Run Prisma migrations
- [ ] Finish backend migrations and seed data for local dev
- [ ] Email verification on registration (password reset is already done — see above)
- [ ] Implement server-side rate limiting and content moderation automation

### 📋 Remaining Planned Work
The core product features (messaging, user discovery & follows, group chats, crag/route browsing, ticks, gear lists, notifications, and admin reporting) are implemented. Remaining work focuses on polishing, reliability, and delivery tasks below.
- [ ] Write the test suite — currently zero test files exist despite Vitest/Playwright being configured (tests/ and Playwright)
- [ ] Offline Journals feature (Dexie.js sync) — `Journal` is currently a DB model only, no routes/UI
- [ ] Seed data and local developer workflows (`prisma/seed.js`, `.env` examples)
- [ ] Monitoring, logging, and observability (Sentry, metrics)
- [ ] Performance tuning and pagination improvements for large feeds
- [ ] Production hardening (rate limits, abuse mitigation, CD pipeline)

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For questions or issues, please open an issue on GitHub.

---

**Next Steps:**
1. Set up PostgreSQL database: `createdb climbersden_dev`
2. Update `.env` with your API keys (Cloudinary, Mapbox, OpenWeather)
3. Run migrations: `npm run db:migrate`
4. Start development: `npm run dev`

Built with ❤️ for the climbing community
