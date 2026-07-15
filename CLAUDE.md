# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend
npm run dev        # start dev server at http://localhost:8080
npm run build      # production build
npm run lint       # ESLint
npm run test       # run tests once (vitest)
npm run test:watch # watch mode
npm run preview    # preview production build

# Backend (from backend/ directory)
pip install -r requirements.txt   # install dependencies
python manage.py migrate           # apply DB migrations
python manage.py seed_data         # seed test accounts and plans
python manage.py runserver         # start Django at http://localhost:8000
```

Dev server binds to `::` (all interfaces), so it is reachable on the local network at the IPs Vite prints on startup.

## Architecture

### Big picture

React SPA (Vite + TypeScript) with a Django REST Framework backend (`backend/`). There is no Supabase dependency. All data access goes through the API client at `src/lib/api.ts` which calls `http://localhost:8000/api` (configurable via `VITE_API_URL`). The app is a multi-tenant SaaS with two independent business modules gated behind subscriptions.

### Auth and access control

`src/contexts/AuthContext.tsx` is the single source of truth for auth state. It exposes `user`, `profile`, `subscription`, and two access-check helpers:

- `canAccessModule("restaurant" | "inventory")` — checks subscription status and plan `module_access`
- `isTrialExpired()` — checks `subscription.status === "trial"` against `end_date`

**Two orthogonal access dimensions:**

| Dimension | Values | Where stored |
|---|---|---|
| User role | `admin` / `user` | `profiles.role` (Django model field) |
| Module access | `cafe` / `inventory` / `combo` | `plans.module_access` → `subscriptions` |

Note: `restaurant` in the UI/code maps to `cafe` in the database (`module_access = 'cafe'`). Admin users do not automatically get module access — they need a subscription too.

**Auth flow:** `/` → `/login` → `/modules` (ModuleSelection) → `/restaurant/...` or `/inventory/...`

In `App.tsx`, unauthenticated users see only public routes. Authenticated users are wrapped in `<ModuleGuard>` which redirects to `/trial-expired` or `/access-denied` as appropriate.

Admin routes (`/admin/...`) check `profile.role === "admin"` directly in `AdminLayout.tsx` and redirect to `/access-denied` otherwise.

### Module structure

Each business module is self-contained:

- **Restaurant** (`/restaurant/...`) — pages in `src/pages/restaurant/`, wrapped by `RestaurantLayout.tsx`, and additionally wrapped in `<OrdersProvider>` (via `RestaurantWrapper` in App.tsx) which provides shared order state across restaurant pages.
- **Inventory** (`/inventory/...`) — pages in `src/pages/inventory/`, wrapped by `InventoryLayout.tsx`.
- Some pages (`CustomersPage`, `StaffPage`, `AlertsPage`, `SettingsPage`, `ExpensesPage`) are shared between both modules via the same component file in `src/pages/inventory/`.

### Database schema (Django / SQLite)

Django models in `backend/api/models.py`. All business data is scoped per-user (multi-tenant via `user` FK).

**Auth/admin:** `User`, `Profile`, `Plan`, `Subscription`, `Payment`, `ActivityLog`
**Restaurant:** `Ingredient`, `MenuItem`, `MenuItemIngredient`, `RestaurantTable`, `Order`, `OrderItem`
**Inventory:** `Supplier`, `Product`, `Purchase`, `PurchaseItem`, `Sale`, `SaleItem`, `Expense`
**Shared:** `Staff`, `Customer`, `Alert`, `BusinessSettings`

All API endpoints require JWT authentication (Bearer token). The `IsAdminRole` permission is used for admin-only endpoints. User-scoped endpoints filter by `request.user` automatically.

### UI conventions

- **Component library:** shadcn/ui (Radix primitives + Tailwind). All primitives are in `src/components/ui/`.
- **Custom Tailwind tokens:** `restaurant`, `inventory`, `cafe-{warm,cream,espresso,latte,mocha}`, `success`, `warning`, `info`, `sidebar-*` — defined in `tailwind.config.ts` via CSS variables in `src/index.css`.
- **Path alias:** `@/` maps to `src/`.
- **Font classes:** `font-display` for headings, `font-sans` for body.
- The background pattern class `cafe-pattern` is used on full-page auth screens.

### Test accounts

Run `python manage.py seed_data` (from `backend/`) to create four test users in Django:

| Email | Password | Access |
|---|---|---|
| `admin@test.com` | `Admin@1234` | Admin panel + Combo (both modules) |
| `restaurant@test.com` | `Test@1234` | Cafe/Restaurant module |
| `inventory@test.com` | `Test@1234` | Inventory module |
| `combo@test.com` | `Test@1234` | Both modules |

The login page shows a collapsible **Test Accounts** panel in dev mode (`import.meta.env.DEV`) for one-click credential fill.
