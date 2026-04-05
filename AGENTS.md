# ShiftSync Implementation Guide

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma 7 ORM
- **Auth**: Better Auth with Admin Plugin
- **UI**: shadcn/ui + Tailwind CSS
- **Real-time**: Server-Sent Events

## Project Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your database URL and secrets
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Create Database Migrations
```bash
npx prisma migrate dev --name init
```

### 5. Seed Database (optional but recommended)
```bash
npx tsx prisma/seed.ts
```

### 6. Run Development Server
```bash
npm run dev
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@coastaleats.com | password123 |
| Manager | manager@coastaleats.com | password123 |
| Staff | sarah@coastaleats.com | password123 |

## Key Files

### Configuration
- `prisma/schema.prisma` - Database schema
- `prisma.config.ts` - Prisma 7 configuration
- `src/lib/auth.ts` - Better Auth configuration
- `src/lib/permissions.ts` - Role-based access control

### Constraint Validation
- `src/lib/constraints/index.ts` - Shift assignment validation engine

### API Routes
- `src/app/api/auth/[...all]/route.ts` - Better Auth API

## Authentication Flow

1. Users sign in via `/login` using email/password
2. Better Auth creates a session with user data
3. Middleware (`src/middleware.ts`) protects routes based on auth state and roles
4. Admin plugin provides user management endpoints

## Role Hierarchy

```
ADMIN
├── Full user management
├── All locations access
├── Analytics & audit logs
└── System configuration

MANAGER
├── Assigned location management
├── Shift creation & publishing
├── Swap/drop approval
└── Staff oversight

STAFF
├── View published schedule
├── Set availability
├── Request swaps/drops
└── Pick up available shifts
```

## Intentional Ambiguities Resolved

1. **Historical data on de-certification**: Records preserved, marked as historical
2. **Desired hours vs availability**: Desired = goal, availability = hard constraint
3. **Consecutive days**: Any shift >0 hours counts
4. **Post-approval shift edit**: Requires new approval
5. **Timezone boundary**: Use location's primary timezone

## Known Limitations

1. Email notifications simulated (console logging)
2. No SMS/phone notifications
3. No mobile-native push notifications
4. Audit log export is basic CSV only

## Commands

```bash
# Development
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Build
npm run build

# Prisma operations
npx prisma studio      # Open database GUI
npx prisma migrate     # Run migrations
npx prisma generate    # Generate client
npx prisma migrate reset --force  # Reset database (dev only)
npx tsx prisma/seed.ts  # Seed database with demo data
```

## Key Features Implemented

### Constraint Validation
- **Double Booking**: Prevents assigning staff to overlapping shifts
- **Rest Period**: Enforces 10-hour minimum rest between shifts
- **Skill Match**: Verifies staff has required skill certification
- **Location Certification**: Checks staff is certified for the location
- **Availability**: Validates against user's weekly availability
- **Overtime Limits**: Daily (12hr) and weekly (40hr) limits
- **Consecutive Days**: Warns on 6th day, blocks 7th unless manager override

### Override System
- 7th consecutive day requires manager override with documented reason (min 5 chars)
- Override reason is stored and visible in shift history

### Overnight Shifts
- Shifts where start_time > end_time are supported
- Displayed with "+" suffix to indicate next-day end
- Availability checking handles overnight availability windows
