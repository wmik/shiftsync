# ShiftSync

Multi-location staff scheduling platform for Coastal Eats restaurant group.

## Features

- **User Management**: Three roles (Admin, Manager, Staff) with granular permissions
- **Shift Scheduling**: Create, assign, and publish shifts with constraint validation
- **Labor Law Compliance**: Overtime tracking, rest period enforcement, consecutive day limits
- **Swap & Coverage**: Request shift swaps and drops with manager approval workflow
- **Fairness Analytics**: Track premium shift distribution and hours equity
- **Real-time Updates**: Live schedule updates via Server-Sent Events
- **Audit Logging**: Complete change history with export capabilities

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL + Prisma 7 ORM
- **Auth**: Better Auth with Admin Plugin
- **UI**: shadcn/ui + Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Installation

```bash
# Clone and install
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# Generate Prisma client
npx prisma generate

# Create database schema
npx prisma migrate dev --name init

# Seed demo data (optional)
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@coastaleats.com | password123 |
| Manager | manager@coastaleats.com | password123 |
| Staff | sarah@coastaleats.com | password123 |

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login/logout pages
│   ├── (dashboard)/     # Protected dashboard pages
│   │   ├── schedule/     # Shift calendar
│   │   ├── staff/        # Staff management
│   │   ├── locations/    # Location management
│   │   ├── requests/     # Swap/drop requests
│   │   ├── analytics/    # Reports & fairness
│   │   └── admin/        # User management
│   └── api/auth/         # Better Auth endpoints
├── components/           # UI components
├── lib/
│   ├── auth.ts          # Better Auth config
│   ├── db.ts            # Prisma client
│   ├── constraints/      # Shift validation engine
│   └── permissions.ts   # RBAC definitions
└── types/               # TypeScript types
```

## Documentation

See [AGENTS.md](AGENTS.md) for detailed implementation notes and developer guide.
