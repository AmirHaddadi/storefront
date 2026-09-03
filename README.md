# Storefront

A generic, **Persian-first** e-commerce foundation built with plain Node.js,
Express 5 and MongoDB — no front-end framework, no build step.

Storefront is a clean, modular starting point for online stores in many
domains: fashion, electronics, cosmetics, food, industrial goods, general
retail, B2C or B2B catalog businesses. It ships with a working storefront, a
full admin panel with role-based access control, OTP customer accounts, a
catalog with categories / colors / variants / inventory, discounts, orders
with card-to-card payment and order tracking, image uploads, and an optional
Telegram admin bot.

> Storefront is developed and maintained by **Amir Haddadi** and released as a
> free open-source project for the developer community. It can be freely used,
> studied, modified and adapted for personal, commercial and industrial
> projects, subject to this project's license and the licenses of its
> third-party dependencies and assets.
>
> It is a foundation, not a finished product. It is not claimed to be "100%
> secure", bug-free, or guaranteed production-ready — review and harden it for
> your own use.

فروشگاه اینترنتی متن‌باز، فارسی و راست‌به‌چپ. رابط کاربری کاملاً فارسی است و
معماری برای افزودن زبان‌های دیگر آماده می‌شود (بخش
[Internationalization](#internationalization)).

---

## Contents

- [Overview](#overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Modules](#modules)
- [Internationalization](#internationalization)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Database](#database)
- [API](#api)
- [Development](#development)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

## Overview

Storefront serves a set of static HTML pages with a lightweight, extension-less
router; the browser fetches data from a JSON API. All content — products,
categories, banners, hero slides, colors, site settings — lives in MongoDB and
is editable from the admin panel (or the Telegram bot). There is intentionally
**no client framework and no bundler**: the front end is vanilla HTML, a
token-based CSS design system, and two JavaScript files (`script.js` for the
storefront, `assets/js/admin.js` for the panel).

The domain model is deliberately generic. A product has a `code`, `name`,
`category`, `price`, `images`, an optional free-text `material` attribute,
optional `colors` / `sizes`, and per-combination `variants` for stock. Nothing
in the data model is specific to a single industry.

## Features

Everything listed here is implemented in this repository:

- **Storefront** — landing page with dynamic hero slider and a multi-step
  feature visualizer, category pages, product detail pages, search, advanced
  sidebar filtering (category / color / size / stock / badges) with state
  persisted in `localStorage`, light/dark theme.
- **Catalog** — categories with parent/child nesting, a shared color palette
  (24-plus base colors, admin can add custom RGB colors), product images
  (up to 10, auto-converted to WebP with `sharp`), an optional `material`
  attribute.
- **Variants & inventory** — per color+size stock tracking, or a single stock
  count, or a manual "in stock" flag; `inStock` is always derived from real
  remaining quantity.
- **Discounts** — time-window or stock-quota product discounts (final price is
  computed at read time, base price is untouched), plus reusable coupon codes
  (percent / fixed, first-order-only, phone-bound, usage caps, expiry).
- **Cart & checkout** — client-side cart in `localStorage`, a dedicated
  checkout page, card-to-card payment with a payment-deadline timer and
  receipt upload (a bank-gateway path is stubbed but hidden until wired).
- **Orders** — order codes, status pipeline
  (`awaiting_payment_confirmation → registered → preparing → shipped →
  delivered`, plus `payment_rejected`), stock is decremented only on payment
  confirmation, guest and logged-in order tracking with a visual timeline.
- **Customer accounts** — passwordless OTP login (phone + 4-digit code),
  Mongo-backed 30-day sessions, editable profile, and an optional size-guide
  module that suggests a size from body measurements.
- **Admin panel** — single-page panel over `/admin/*` routes: orders,
  products, categories, colors, coupons, banners, hero slides, users, site
  appearance, admin management, and an optional reports/charts section with
  Excel export.
- **RBAC** — custom role-based access control; each admin has a permission set
  (`users`, `orders`, `products`, `coupons`, `appearance`, `admins`,
  `reports`) or is a super-admin. Enforced on every admin route.
- **Media** — uploads (avatars, receipts, product/category/hero images) with a
  configurable storage root so files can live on a persistent volume.
- **Notifications** — a replaceable notification layer (`server/lib/notifier.js`)
  that logs to the console by default; plug in SMS / email / push by
  registering a channel.
- **Telegram admin bot** (optional) — a full Persian admin bot (Telegraf,
  webhook, same process) mirroring the panel plus real-time order alerts.
  Completely disabled unless a bot token is set.
- **Database backup tool** (optional) — a token-guarded `/dev/db/backup` page
  and API for full DB export / restore, with optional weekly auto-backup.

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js ≥ 18 |
| HTTP | Express 5 (no view engine — static HTML + JSON API) |
| Database | MongoDB via Mongoose 9 |
| Front end | Vanilla HTML / CSS / JavaScript, token-based CSS design system |
| Images | `sharp` (WebP conversion), `multer` (uploads) |
| Optional bot | `telegraf` |
| Reports export | `exceljs` |
| DB backup | `adm-zip`, `bson` (EJSON) |
| Auth | OTP + hashed static admin token, Mongo-backed sessions, `cookie-parser` |

No bundler, transpiler, or front-end framework. No CSS preprocessor.

## Architecture

```
server.js                 bootstrap: connect DB, run migrations, start HTTP, register bot webhook
└── server/app.js          Express app: middleware, static files, route mounting, 404
    ├── routes/             HTTP entry points only — thin, delegate to services
    │   ├── pages.js        clean (extension-less) page routes + admin page guard
    │   ├── api.js          public/customer JSON API  (/api/*)
    │   ├── adminApi.js     admin JSON API            (/admin/api/*, behind auth + RBAC)
    │   └── devApi.js       DB backup API             (/dev/api/db-backup/*, token-gated)
    ├── services/           business logic — shared by adminApi.js AND the Telegram bot
    ├── models/             Mongoose schemas (the data contract)
    ├── lib/                infrastructure utilities (see Modules)
    ├── telegram/           optional admin bot, isolated; no-ops without a token
    └── scripts/seed.js     demo data

public-html/                static front end, served by Express
├── *.html                  pages (some shared across several routes via a tiny client router)
├── script.js               storefront client logic
├── assets/js/admin.js      admin panel client logic
└── assets/css/             tokens.css → base.css → components.css → layout.css (load order matters)
```

**Boundaries.** Routes never contain business logic — they parse the request,
call a service, and shape the response. Services are the reusable core and are
consumed by both the web admin API and the Telegram bot, so there is a single
implementation of each operation. Models define the data contract. `lib/`
holds cross-cutting infrastructure. The Telegram bot is a self-contained
integration that the rest of the app does not depend on.

## Project structure

```
storefront/
├── server.js
├── server/
│   ├── app.js
│   ├── lib/            db, auth, adminAuth, upload, notifier, orderStatus,
│   │                   coupons, shipping, pages, schemaJson, dbBackup,
│   │                   pageViewTracker, reportsFlag, newArrivalSweep,
│   │                   telegramAdminLog, xlsxExport
│   ├── models/         Admin, AdminSession, Banner, Category, Color, Coupon,
│   │                   HeroSlide, LoginEvent, Order, PageView, Product,
│   │                   SiteSettings, SizeProfile, TelegramBotSession, User,
│   │                   UserSession
│   ├── services/       adminService, bannerService, categoryService,
│   │                   colorService, couponService, heroService,
│   │                   orderService, productService, reportService,
│   │                   settingsService, userService
│   ├── routes/         pages, api, adminApi, devApi
│   ├── telegram/       bot, index, notify, lib/, menus/, wizards/, middlewares/
│   └── scripts/        seed.js, migrateProductImages.js
├── public-html/
│   ├── index / category / product / checkout / faq / contact
│   ├── account-panel / account-sizes / admin-login / admin-panel / dev-db-backup
│   ├── script.js
│   └── assets/  css/ js/ images/ fonts/ favicon/ data/ uploads/
├── .env.example
├── .gitignore
├── package.json
├── README.md · LICENSE · CONTRIBUTING.md · CODE_OF_CONDUCT.md · SECURITY.md
└── CHANGELOG.md · THIRD-PARTY-NOTICES.md
```

## Modules

| Concern | Where | Notes |
|---|---|---|
| Authentication (customer) | `lib/auth.js`, `routes/api.js` | OTP request/verify, Mongo sessions, `requireAuth` / `attachUser` |
| Authentication (admin) & RBAC | `lib/adminAuth.js`, `models/Admin.js` | hashed static token, `requireAdminAuth`, `requirePermission(section)` |
| Users | `models/User.js`, `services/userService.js` | profile, addresses |
| Admin management | `services/adminService.js` | create admins, permission sets, Telegram linking |
| Catalog · Products | `models/Product.js`, `services/productService.js` | code/name/price/images/material |
| Catalog · Categories | `models/Category.js`, `services/categoryService.js` | parent/child nesting |
| Catalog · Colors | `models/Color.js`, `services/colorService.js` | shared palette |
| Attributes | `Product.material` (free text), `Product.sizes` | generic, optional |
| Variants & Inventory | `Product.variants`, `Product.registerSale()` | per color+size stock, derived `inStock` |
| Cart | `public-html/script.js` (`localStorage`) | client-side only |
| Orders | `models/Order.js`, `services/orderService.js` | status pipeline, timeline |
| Payments | `routes/api.js`, `models/SiteSettings.js` | card-to-card active, gateway stubbed |
| Discounts | `models/Coupon.js` + `lib/coupons.js`, product discount fields | coupons + per-product discounts |
| Media | `lib/upload.js` | multer + sharp, `UPLOADS_ROOT` |
| Notifications | `lib/notifier.js` | console by default, `setChannel()` to plug a provider |
| Integrations | `server/telegram/` | optional admin bot, env-gated |
| Configuration | `models/SiteSettings.js`, `.env` | color preset, card details, feature flags |
| Reporting | `services/reportService.js`, `lib/xlsxExport.js` | behind `REPORTS_ENABLED` |
| Backup/restore | `lib/dbBackup.js`, `routes/devApi.js` | behind `DB_BACKUP_TOKEN` |

## Internationalization

The current release is **Persian-first and fully usable in Persian**. Every
page is `<html lang="fa" dir="rtl">`, the bundled Shabnam font and the CSS
design system are built for RTL, and numbers/dates are formatted with
`Intl`/`toLocaleString('fa-IR')` and a Jalali calendar helper.

UI strings today live inline in the HTML and JS. The architecture is being
prepared for proper multilingual support:

- a single locale configuration point (`lang` / `dir`),
- RTL/LTR-aware CSS (logical properties are already used in most places),
- locale-aware formatting helpers already isolated from view code,
- server labels (e.g. order-status text) centralized in `lib/orderStatus.js`
  so they can move behind a dictionary without touching route or view logic.

Completing i18n — extracting strings into `fa` / `en` dictionaries and adding a
language switch — is **Roadmap Phase 2** and an explicit invitation for
community contribution. Persian remains the primary language; the goal is to
add languages without duplicating application logic.

## Installation

Prerequisites: **Node.js ≥ 18** and a running **MongoDB** (local default:
`mongodb://127.0.0.1:27017`).

```bash
git clone https://github.com/AmirHaddadi/storefront.git
cd storefront
npm install

cp .env.example .env
# edit .env: set MONGODB_URI and INITIAL_ADMIN_TOKEN

npm run seed        # demo categories, colors, hero slides, 8 demo products,
                    # a demo coupon, and the first super-admin
npm start           # http://localhost:3000
```

- Storefront: <http://localhost:3000>
- Admin panel: <http://localhost:3000/admin/login> — log in with the value of
  `INITIAL_ADMIN_TOKEN`.
- SMS / Telegram are **not** required; OTP codes and notifications are printed
  to the server console in the default configuration.

`npm run seed:reset` wipes the catalog and re-seeds from scratch.

## Environment variables

Only `MONGODB_URI` is required. Everything else is optional; see
`.env.example` for full comments.

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB connection string |
| `PORT` / `HOST` | no | HTTP bind (default `3000` / `0.0.0.0`) |
| `NODE_ENV` | no | `development` / `production` |
| `INITIAL_ADMIN_TOKEN` | seed only | login token for the first super-admin |
| `UPLOADS_ROOT` | no | directory for uploaded files (use a persistent disk in prod) |
| `TELEGRAM_BOT_TOKEN` | no | enables the admin bot; empty = bot disabled |
| `TELEGRAM_BOT_USERNAME` | no | for building the account-link deep link |
| `TELEGRAM_WEBHOOK_SECRET` | no | random secret in the webhook path |
| `PUBLIC_BASE_URL` | no | public URL, used to register the Telegram webhook |
| `TELEGRAM_ADMIN_CHAT_IDS` | no | chat ids that get alerts / act as super-admins |
| `REPORTS_ENABLED` | no | `on`/`1`/`true` exposes `/admin/reports` and its API |
| `DB_BACKUP_TOKEN` | no | enables `/dev/db/backup`; empty = 404 |
| `DB_BACKUP_ROOT` | no | directory for backup `.zip` files |

## Database

MongoDB accessed through Mongoose. Schemas are in `server/models/`; collections
are created on first write. On startup the server runs a small idempotent
migration (`migrateProductImages.js`) and, if `DB_BACKUP_TOKEN` is set,
schedules a weekly full backup (keeping the 50 most recent).

- `npm run seed` — idempotent: upserts demo categories / colors / hero slides,
  inserts demo products only when the collection is empty, and creates the
  first super-admin only when there are no admins.
- `npm run seed:reset` — drops products / categories / coupons / hero slides
  first.

## API

Selected endpoints. Public API is under `/api`, admin API under `/admin/api`
(every route behind `requireAdminAuth`, most also behind
`requirePermission(<section>)`).

**Public**

| Method & path | Purpose |
|---|---|
| `GET /api/settings` | site settings (color preset, card-to-card details) |
| `GET /api/categories` · `GET /api/colors` | catalog taxonomy |
| `GET /api/products?category=&search=` | product list (public view, discounts applied) |
| `GET /api/products/:code` | single product |
| `GET /api/hero-slides` · `GET /api/banners` | landing content |
| `POST /api/auth/otp/request` · `POST /api/auth/otp/verify` · `POST /api/auth/logout` | OTP login |
| `GET /api/me` · `PUT /api/me/profile` · `POST /api/me/avatar` | account |
| `GET/POST /api/me/sizes` · `DELETE /api/me/sizes/:id` | size guide |
| `POST /api/coupons/validate` | validate a coupon against a subtotal |
| `POST /api/orders` · `POST /api/orders/:id/receipt` | place order, upload receipt |
| `GET /api/me/orders` · `GET /api/orders/track?code=&phone=` | order history & tracking |

**Admin** (`/admin/api`)

`POST /login` · `POST /logout` · `GET /me` ·
`GET/PUT/DELETE /users*` ·
`GET /orders` · `PATCH /orders/:id` ·
`GET/POST/PUT/DELETE /products*` · `POST /products/upload-images` · `GET /products/next-code` ·
`GET/POST/PUT/DELETE /categories*` · `GET/POST /colors` ·
`GET/POST/PUT/DELETE /coupons*` ·
`GET/POST/PUT/DELETE /banners*` · `GET/POST/PUT/DELETE /hero-slides*` ·
`GET/PUT /settings` · `GET/PUT /card-settings` ·
`GET/POST/PUT/DELETE /admins*` ·
`GET /reports/*` (when `REPORTS_ENABLED`).

**Pages** use clean routes with no file extension (`/`, `/faq`, `/contact`,
`/checkout`, `/category/:id`, `/:category/:code`, `/account/*`, `/track`,
`/admin/*`). Direct requests to `*.html` return 404.

## Development

- **No build step.** Edit files and restart the server (`npm start`). Front-end
  changes are picked up on browser refresh.
- `npm run check` — syntax-checks `server.js` and loads `server/app.js`.
- **Layers.** Put HTTP concerns in `routes/`, business logic in `services/`,
  data shape in `models/`, infrastructure in `lib/`. If the admin API and the
  Telegram bot both need an operation, it belongs in a service.
- **Front end.** Reuse components from `components.css` before adding new
  styles; keep the four-file CSS load order. Product identity on the client is
  the 4-char `code`, not the Mongo id. All asset `href`/`src` are absolute
  (`/assets/...`).
- **Comments** in the codebase are currently in Persian; keep that consistent
  within a file until the i18n pass, and match the surrounding style.
- Please run through the storefront and the admin panel manually before
  opening a PR (there is no automated test suite yet — adding one is welcome).

## Roadmap

The initial release is the foundation for community-driven development.

- **Phase 1 — Clean modular public release.** Generic domain model, module
  boundaries, safe demo data, documentation. *(this release)*
- **Phase 2 — Internationalization.** Extract UI strings into `fa` / `en`
  dictionaries, add a locale switch and full LTR support, keep Persian as the
  default.
- **Phase 3 — Community contributions.** Documentation, UI/UX improvements,
  an automated test suite, more payment / shipping / notification integrations.
- **Phase 4 — More extensible commerce modules.** Pluggable payment and
  shipping providers, a generic product-attribute system, a public plugin
  surface.

Contributors interested in clean engineering and open-source development are
welcome. Future features are intentionally not over-promised.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Security reports: see
[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). Bundled third-party fonts, icons and libraries keep their own
licenses — see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). This project
claims no ownership over them.

## Author

**Amir Haddadi** — <https://github.com/AmirHaddadi>

Storefront is independent of any client project it may have been inspired by,
and is released as a fresh, self-contained open-source codebase.
