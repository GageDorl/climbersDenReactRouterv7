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

### Phase 3 Features
- **Offline Journals**: Private climbing journals that sync when online

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
│   ├── geo-utils.ts    # Geolocation & distance calculations
│   └── validation.ts   # Zod validation schemas
├── components/          # React components
│   ├── ui/             # Base UI components (Radix UI)
│   ├── auth/           # Authentication components
│   ├── posts/          # Social feed components
│   ├── messages/       # Messaging components
│   ├── crags/          # Crag & route components
│   └── ...
├── hooks/               # Custom React hooks
│   └── use-geolocation.ts  # Device GPS access hook
├── types/               # TypeScript type definitions
│   └── db.ts           # Prisma types & custom interfaces
└── app.css             # Global styles (Tailwind)

prisma/
└── schema.prisma       # Database schema (18 entities)

tests/
├── routes/             # Loader/action tests
├── lib/                # Business logic tests
├── components/         # Component tests (React Testing Library)
└── e2e/                # End-to-end tests (Playwright)
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

Minimum coverage threshold: **80%** for branches, functions, lines, and statements.

## 🌐 Tech Stack

### Frontend
- **React 19** - UI library
- **React Router v7** - Fullstack framework with SSR
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Mapbox GL JS** - Interactive maps
- **Dexie.js** - IndexedDB for offline journals

### Backend
- **Node.js** - JavaScript runtime
- **Prisma** - Type-safe ORM
- **PostgreSQL 15+** - Relational database
- **Socket.IO** - Real-time WebSocket communication
- **Cloudinary** - Media storage and CDN
- **Bcrypt** - Password hashing
- **Zod** - Runtime type validation

### Testing
- **Vitest** - Unit and integration testing
- **Playwright** - End-to-end testing
- **React Testing Library** - Component testing
- **MSW** - API mocking

## 📊 Database Schema

The application uses 18 PostgreSQL entities:

**User Management**: User, Follow, Block, Notification, Report

**Social Features**: Post, Like, Message, Conversation, GroupChat, GroupMessage

**Climbing Data**: Crag, Route, Tick, RouteRating, FavoriteCrag, WeatherForecast

**Trip Planning**: GearList, GearItem, Journal, CragSubmission

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
- [x] Database schema with 18 entities
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

### 🔄 Next Steps
- [ ] Initialize PostgreSQL database
- [ ] Run Prisma migrations
- [ ] Finish backend migrations and seed data for local dev
- [ ] Harden authentication and session edge-cases (email verification, password reset flows already scaffolded)
- [ ] Implement server-side rate limiting and content moderation automation

### 📋 Remaining Planned Work
The core product features (messaging, user discovery & follows, group chats, crag/route browsing, ticks, gear lists, notifications, and admin reporting) are implemented. Remaining work focuses on polishing, reliability, and delivery tasks below.
- [ ] End-to-end test coverage and flaky test stabilization (tests/ and Playwright)
- [ ] Seed data and local developer workflows (`prisma/seed.js`, `.env` examples)
- [ ] Monitoring, logging, and observability (Sentry, metrics)
- [ ] Performance tuning and pagination improvements for large feeds
- [ ] Production hardening (rate limits, abuse mitigation, CD pipeline)

For the full original task breakdown refer to `../specs/001-climber-social-app/tasks.md`.

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
