# Commit Plan

## Initial Setup (Phase 1-2 Complete)

This document outlines the initial project setup commits.

### Commit 1: Project Scaffolding
**Scope**: `init`

Initial Next.js 16 project with TypeScript, Tailwind, and core dependencies.

```
feat(init): scaffold ShiftSync project

- Initialize Next.js 16 with App Router
- Add TypeScript, Tailwind, ESLint configuration
- Install Prisma 7, Better Auth, shadcn/ui
- Set up directory structure
- Add AGENTS.md implementation guide
```

**Files**:
- `package.json`, `tsconfig.json`, `tailwind.config.ts`
- `.env.example`, `eslint.config.mjs`, `next.config.ts`
- `components.json`

---

### Commit 2: Database Schema
**Scope**: `db`

Complete Prisma schema with Better Auth tables and ShiftSync domain models.

```
feat(db): add Prisma schema with Better Auth and domain models

- Add Better Auth tables (user, session, account, verification)
- Add ShiftSync tables (location, skill, certification, availability,
  shift, shift_assignment, swap_request, drop_request,
  notification, audit_log, manager_location)
- Configure snake_case naming convention
```

**Files**:
- `prisma/schema.prisma`
- `prisma.config.ts`
- `prisma/seed.ts`

---

### Commit 3: Authentication System
**Scope**: `auth`

Better Auth configuration with Admin Plugin and RBAC permissions.

```
feat(auth): configure Better Auth with Admin Plugin and RBAC

- Set up Better Auth with snake_case field mapping
- Configure Admin Plugin for user management
- Add Prisma client with pg adapter
- Implement role-based access control (Admin, Manager, Staff)
- Add middleware for route protection
```

**Files**:
- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/lib/db.ts`
- `src/lib/permissions.ts`
- `src/middleware.ts`
- `src/app/api/auth/[...all]/route.ts`

---

### Commit 4: Constraint Validation Engine
**Scope**: `constraints`

Shift assignment validation with business rules.

```
feat(constraints): implement shift assignment validation engine

- Add checkNoDoubleBooking() - prevent overlapping shifts
- Add checkTenHourRest() - enforce minimum rest period
- Add checkSkillMatch() - validate staff skills
- Add checkCertification() - verify required certifications
- Add checkAvailability() - respect staff availability
- Add checkOvertime() - enforce weekly hour limits
- Add suggestAlternatives() - suggest valid alternatives
```

**Files**:
- `src/lib/constraints/index.ts`

---

### Commit 5: UI Components and Pages
**Scope**: `ui`

Dashboard layout, navigation, and page components.

```
feat(ui): add dashboard layout and page components

- Create dashboard sidebar navigation
- Add login/logout pages
- Implement schedule page with calendar/list views
- Add placeholder pages (staff, locations, requests, analytics, admin)
- Configure shadcn/ui components (card, badge, input, tabs, sheet, alert, label)
```

**Files**:
- `src/app/(auth)/*`
- `src/app/(dashboard)/*`
- `src/components/ui/*`

---

### Commit 6: Documentation
**Scope**: `docs`

Project documentation and implementation plan.

```
docs: add README, AGENTS.md, and implementation plan

- Document tech stack, setup, demo accounts
- Add AGENTS.md with implementation guide
- Create plan.md with 13-phase implementation roadmap
- Add CONTRIBUTING.md with contribution guidelines
```

**Files**:
- `README.md`
- `AGENTS.md`
- `plan.md`
- `CONTRIBUTING.md`
- `commit-plan.md`
