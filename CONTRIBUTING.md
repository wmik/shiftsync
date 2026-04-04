# Contributing to ShiftSync

We welcome contributions! Please follow these guidelines.

## Development Setup

```bash
npm install
cp .env.example .env
# Edit .env with your database URL
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## Code Style

- TypeScript strict mode
- ESLint + Prettier
- snake_case for database fields
- camelCase for TypeScript code
- shadcn/ui components for UI

## Branch Strategy

- `main` - production-ready code
- `feat/*` - new features
- `fix/*` - bug fixes
- `refactor/*` - code improvements

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Pull Request Process

1. Create feature branch from `main`
2. Make changes with passing tests/lint/typecheck
3. Update documentation if needed
4. Request review from maintainer

## Testing

```bash
npm run typecheck  # TypeScript check
npm run lint       # ESLint
npm run build      # Production build
```

## Questions?

Open an issue for bugs, features, or questions.
