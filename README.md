# Modular Monolithic E-Commerce Boilerplate + Secure Auth Flow

Production-ready MVP combining both assignments:

1. **Optimized Modular Monolithic E-Commerce Boilerplate**
2. **Secure Authentication Flow** (inside the `users` module)

## Architecture

```
src/
├── app.ts / server.ts
├── config/                 # Zod-validated env
├── shared/
│   ├── database/           # Prisma client (connection pooling via URL)
│   ├── errors/             # Typed AppError hierarchy
│   └── middlewares/        # errorHandler, validate
└── modules/
    ├── users/              # Auth + profile (public interface only)
    │   ├── controllers/
    │   ├── services/       # auth, token, password, email
    │   ├── repositories/
    │   ├── middlewares/    # authenticate, authorize (exported)
    │   └── index.ts        # ← ONLY entry point for other modules
    ├── products/
    └── orders/             # Uses products via public service; auth via users middleware
```

**Strict module boundaries**

- `orders` never queries `users` / `sessions` tables or verifies JWTs.
- `orders` never queries `products` tables directly; it calls `productService.checkAndReserveStock()`.
- Identity is injected only through `authenticate` / `authorize` exported from `users/index.ts`.

## Tech Stack

| Concern        | Choice                          |
|----------------|---------------------------------|
| Runtime        | Node.js ≥ 20                    |
| Language       | TypeScript (strict)             |
| Framework      | Express.js                      |
| Database       | PostgreSQL + Prisma ORM         |
| Validation     | Zod                             |
| Password hash  | argon2id                        |
| Tokens         | JWT (access) + opaque hashed refresh with rotation & reuse detection |

## Quick Start

### 1. Prerequisites

- Node.js 20+
- PostgreSQL 14+

### 2. Install

```bash
cp .env.example .env
# Edit .env – set DATABASE_URL and strong JWT secrets (≥32 chars)

npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

### 3. Run

```bash
npm run dev          # http://localhost:3000
```

### Seeded accounts

| Role     | Email                     | Password     |
|----------|---------------------------|--------------|
| Admin    | admin@ecommerce.local     | Admin123!    |
| Customer | customer@ecommerce.local  | Customer123! |

## Auth Endpoints (`/api/v1`)

| Method | Path                      | Access        | Notes                                      |
|--------|---------------------------|---------------|--------------------------------------------|
| POST   | /auth/register            | Public        | Triggers email verification (console stub) |
| POST   | /auth/login               | Public        | Returns access + refresh tokens            |
| POST   | /auth/refresh             | Refresh token | Rotation + reuse detection                 |
| POST   | /auth/logout              | Access token  | Revokes current session                    |
| POST   | /auth/logout-all          | Access token  | Revokes every session of the user          |
| POST   | /auth/verify-email        | Public        | One-time token                             |
| POST   | /auth/forgot-password     | Public        | Anti-enumeration response                  |
| POST   | /auth/reset-password      | Public        | Revokes all sessions                       |
| GET    | /users/me                 | Access token  | Profile                                     |
| GET    | /admin/ping               | Admin role    | Authorization demo                         |

### Token strategy

- **Access token**: short-lived JWT (default 15m), Bearer header. Claims: `sub`, `role`, `sid`.
- **Refresh token**: opaque, stored **hashed** (SHA-256), bound to a session family.
- **Rotation**: every successful refresh revokes the old token and issues a new one in the same family.
- **Reuse detection**: presenting an already-revoked refresh token → entire family revoked (theft response).
- **Delivery**:
  - Web: `httpOnly`, `Secure`, `SameSite` cookie (`refreshToken`)
  - Mobile: also returned in response body (client stores securely)

### Security features

- argon2id password hashing with configurable cost
- Password policy enforced by Zod + service
- Rate limiting on auth endpoints
- Temporary account lockout after 5 failed logins
- No user enumeration on login / forgot-password / register
- Email verification & password-reset tokens are single-use, hashed, short-lived
- Password reset revokes all sessions
- Roles re-validated from DB on every request
- Helmet + global rate limit + consistent error envelope

## Other endpoints

- `GET /api/v1/products` – list (public)
- `GET /api/v1/products/:id`
- `POST /api/v1/products` – admin only
- `POST /api/v1/orders` – authenticated; reserves stock via products service
- `GET /api/v1/orders/me` – current user’s orders
- `GET /api/v1/orders/me/:id`

## Environment variables

See `.env.example`. Critical ones:

- `DATABASE_URL` – include `?connection_limit=10&pool_timeout=30` for pooling
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (≥32 chars)
- `JWT_ACCESS_EXPIRES_IN` (e.g. `15m`)
- `JWT_REFRESH_EXPIRES_IN` (e.g. `7d`)

## Tests

```bash
npm test
```

Schema-level unit tests are included. Full integration tests (login → refresh → logout, reuse detection, role violation) require a running PostgreSQL instance; extend `tests/` with supertest against a test database.

## Design notes & trade-offs

1. **Refresh storage**: opaque tokens hashed in `sessions` table (not JWTs). Enables instant revocation and reuse detection at the cost of a DB hit on refresh.
2. **Race on concurrent refresh**: last writer wins; the first request to rotate wins, subsequent ones see a revoked token and trigger family revocation (safe fail-closed).
3. **Access-token lifetime vs revocation**: short TTL (15m) means a stolen access token dies quickly; logout immediately invalidates the session so new access tokens cannot be issued.
4. **Guest cart merge**: not fully implemented in this MVP. Recommended approach: orders module exposes `mergeGuestCart(userId, guestCartId)` and is called from `auth.service.login` via an application event or a thin facade, keeping both modules decoupled.
5. **Email**: console stub behind `IEmailProvider` interface – swap for SES/SendGrid without touching business logic.

## Extending

- Add a new domain module under `src/modules/<name>/` with the same internal layout.
- Export only a public `index.ts`.
- Consume identity exclusively via `authenticate` / `authorize` from `users`.
- Consume other domains exclusively via their public services.

## License

MIT
