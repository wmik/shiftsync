# ShiftSync - Complete Implementation Plan

## Project Overview
Multi-location staff scheduling platform for Coastal Eats restaurant group with 4 locations across 2 time zones.

## Tech Stack
| Component | Choice |
|-----------|--------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| Auth | Better Auth + Admin Plugin |
| UI | shadcn/ui + Tailwind CSS |
| Real-time | Server-Sent Events |
| Deployment | Vercel |

## Current Status
- [x] Project scaffolding complete
- [x] Prisma 7 schema with Better Auth models
- [x] Better Auth configuration with snake_case table mapping
- [x] Admin plugin with custom roles
- [x] Dashboard UI shell
- [x] Login/logout pages
- [x] Basic pages (schedule, staff, locations, requests, analytics, admin)
- [x] TypeScript compilation passes
- [x] Build passes
- [ ] Database connection not tested (requires PostgreSQL)
- [ ] Full CRUD operations not implemented
- [ ] Real-time features not implemented
- [ ] Constraint validation not connected to UI

## Project Structure

```
shiftsync/
├── prisma/
│   ├── schema.prisma          # Complete schema with Better Auth + ShiftSync
│   ├── seed.ts               # Seeds skills & locations
│   └── migrations/           # Generated migrations
├── prisma.config.ts           # Prisma 7 configuration
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── logout/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── schedule/page.tsx
│   │   │   ├── staff/page.tsx
│   │   │   ├── locations/page.tsx
│   │   │   ├── requests/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   └── admin/page.tsx
│   │   ├── api/auth/[...all]/route.ts
│   │   └── page.tsx
│   ├── components/ui/         # shadcn components
│   ├── lib/
│   │   ├── auth.ts           # Better Auth config
│   │   ├── auth-client.ts   # Client-side auth
│   │   ├── db.ts            # Prisma client
│   │   ├── permissions.ts   # RBAC roles
│   │   └── constraints/     # Shift validation engine
│   │       └── index.ts      # All constraint functions
│   └── types/index.ts
├── .env
├── .env.example
├── AGENTS.md
└── README.md
```

## Database Schema

### Better Auth Tables (snake_case)
- `user` - id, name, email, email_verified, image, created_at, updated_at, role, banned, ban_reason, ban_expires, timezone
- `session` - id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id, impersonated_by
- `account` - id, account_id, provider_id, user_id, access_token, refresh_token, id_token, access_token_expires_at, refresh_token_expires_at, scope, password, created_at, updated_at
- `verification` - id, identifier, value, expires_at, created_at, updated_at

### ShiftSync Tables
- `location` - id, name, address, timezone, created_at, updated_at
- `skill` - id, name, created_at
- `certification` - id, user_id, location_id, skill_id, certified_at
- `availability` - id, user_id, day_of_week, start_time, end_time, effective_from, effective_until
- `availability_exception` - id, user_id, date, is_available, reason, created_at
- `shift` - id, location_id, skill_id, date, start_time, end_time, headcount, is_published, cutoff_hours, created_by, created_at, updated_at
- `shift_assignment` - id, shift_id, user_id, assigned_by, status, assigned_at
- `swap_request` - id, requester_shift_id, requester_user_id, target_user_id, status, created_at, updated_at
- `drop_request` - id, shift_id, status, expires_at, claimed_by_user_id, created_at
- `notification` - id, user_id, type, message, is_read, created_at
- `audit_log` - id, entity_type, entity_id, action, user_id, before, after, created_at
- `manager_location` - id, user_id, location_id

## Auth Configuration

### Better Auth Setup (src/lib/auth.ts)
```typescript
- Uses prismaAdapter with provider: "postgresql"
- Custom table/field mapping for snake_case
- Admin plugin with custom roles: admin, manager, staff
- Email/password authentication enabled
```

### Roles (src/lib/permissions.ts)
```typescript
shiftSyncAdmin: Full access to all resources
shiftSyncManager: shift.create/read/update/publish, location.read, staff.read/update
shiftSyncStaff: shift.read, location.read, staff.read
```

## Implementation Phases

### Phase 1: Database Setup (Not Started)
- [ ] Install PostgreSQL locally or use hosted service
- [ ] Update .env with real DATABASE_URL
- [ ] Run `npm run db:migrate`
- [ ] Run `npm run db:seed`
- [ ] Test connection

### Phase 2: Auth Integration (Partial - Not Tested)
- [ ] Test login flow with Better Auth
- [ ] Verify session management
- [ ] Test role-based access in middleware
- [ ] Connect admin plugin API

### Phase 3: Location & Skills CRUD (Not Started)
- [ ] Create /api/locations routes
- [ ] Create /api/skills routes
- [ ] Build location management UI
- [ ] Build skill management UI
- [ ] Add admin-only restrictions

### Phase 4: Staff Management (Not Started)
- [ ] Create /api/staff routes
- [ ] Build staff list view
- [ ] Add certification management
- [ ] Build availability builder
- [ ] Add manager-only restrictions

### Phase 5: Shift Scheduling (Not Started)
- [ ] Create /api/shifts routes
- [ ] Build shift creation form
- [ ] Connect constraint validation engine
- [ ] Build shift assignment UI
- [ ] Add publish/unpublish functionality
- [ ] Implement cut-off logic (48h before shift)

### Phase 6: Constraint Validation Engine (Started - Not Connected)
The engine exists at `src/lib/constraints/index.ts` with:
- checkNoDoubleBooking()
- checkTenHourRest()
- checkSkillMatch()
- checkCertification()
- checkAvailability()
- checkOvertime()
- suggestAlternatives()
- validateAssignment()

Needs: Connection to API routes and UI

### Phase 7: Swap & Drop Requests (Not Started)
- [ ] Create /api/requests/swap routes
- [ ] Create /api/requests/drop routes
- [ ] Build swap request flow (request → accept → approve)
- [ ] Build drop request with 24h expiration
- [ ] Implement max 3 pending requests
- [ ] Auto-cancel on shift edit
- [ ] Add SSE for real-time updates

### Phase 8: Notifications (Not Started)
- [ ] Create notification service
- [ ] Build notification center UI
- [ ] Add read/unread functionality
- [ ] Implement notification triggers

### Phase 9: Overtime Tracking (Not Started)
- [ ] Build overtime calculation API
- [ ] Add warning system (35h weekly, 8h daily)
- [ ] Add hard blocks (40h weekly, 12h daily)
- [ ] Add consecutive day tracking (6th warn, 7th override)
- [ ] Build what-if calculator

### Phase 10: Fairness Analytics (Not Started)
- [ ] Build hours distribution API
- [ ] Add premium shift tracking (Fri/Sat evenings)
- [ ] Calculate fairness score
- [ ] Build analytics dashboard

### Phase 11: Audit Logging (Not Started)
- [ ] Create audit log middleware
- [ ] Build audit log API
- [ ] Add admin export functionality
- [ ] Build shift history viewer

### Phase 12: Real-time Features (Not Started)
- [ ] Implement SSE endpoint
- [ ] Add on-duty now dashboard
- [ ] Implement concurrent edit detection
- [ ] Add schedule push notifications

### Phase 13: Testing & Polish (Not Started)
- [ ] Add comprehensive seed data
- [ ] Test all user flows
- [ ] Add loading states
- [ ] Add error handling
- [ ] Mobile responsiveness
- [ ] Performance optimization

## API Routes Structure

```
/api/auth/[...all]    - Better Auth endpoints
/api/locations        - GET, POST
/api/locations/[id]   - GET, PUT, DELETE
/api/skills           - GET, POST
/api/skills/[id]      - GET, PUT, DELETE
/api/staff            - GET, POST
/api/staff/[id]       - GET, PUT
/api/staff/[id]/availability - GET, PUT
/api/staff/[id]/certifications - GET, POST, DELETE
/api/shifts           - GET, POST
/api/shifts/[id]      - GET, PUT, DELETE
/api/shifts/[id]/assign - POST
/api/shifts/[id]/publish - POST
/api/shifts/[id]/unpublish - POST
/api/requests/swap    - GET, POST
/api/requests/swap/[id] - PUT
/api/requests/drop    - GET, POST
/api/requests/drop/[id]/claim - PUT
/api/notifications    - GET
/api/notifications/[id]/read - PUT
/api/audit           - GET (admin only)
/api/sse             - Server-Sent Events
```

## Key Files to Modify

### lib/auth.ts
Current state: Configured but not tested
Needs: Testing with real database

### lib/auth-client.ts
Current state: Configured
Needs: Add signOut callback URL

### lib/constraints/index.ts
Current state: Complete constraint logic
Needs: Connection to API routes

### middleware.ts
Current state: Basic protection
Needs: Better role checking with admin plugin

### Dashboard Pages
Current state: Mock UI
Needs: Real data fetching, forms

## Setup Commands

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with DATABASE_URL

# Generate Prisma client
npm run db:generate

# Create database
npm run db:migrate

# Seed database
npm run db:seed

# Start development
npm run dev
```

## Demo Accounts (via Better Auth sign-up or seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@coastaleats.com | password123 |
| Manager | manager@coastaleats.com | password123 |
| Staff | sarah@coastaleats.com | password123 |

## Known Issues & Notes

1. **Middleware**: Next.js 16 deprecates middleware.ts in favor of proxy - may need update
2. **useSession**: Better Auth's useSession returns atom/store not hook - code uses workaround
3. **Prisma generate output**: Generated to `src/generated/prisma/` per Prisma 7
4. **Better Auth table mapping**: snake_case configured but needs runtime testing
5. **Real-time**: SSE not implemented yet
6. **Database**: Requires PostgreSQL - SQLite won't work with Better Auth

## Intentional Ambiguities Resolved

1. **Historical data on de-certification**: Keep records, mark as historical
2. **Desired hours vs availability**: Desired = goal, availability = hard constraint
3. **Consecutive days**: Any shift >0 hours counts
4. **Post-approval shift edit**: Requires new approval
5. **Timezone boundary**: Use location's primary timezone
