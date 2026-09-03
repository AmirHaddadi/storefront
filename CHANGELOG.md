# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-09-03

First public release — the clean, modular foundation (Roadmap Phase 1).

### Added
- Generic e-commerce foundation: storefront, catalog, cart, checkout, orders,
  order tracking.
- Admin panel with custom role-based access control.
- Passwordless OTP customer accounts with Mongo-backed sessions.
- Product model with categories, shared color palette, optional free-text
  `material` attribute, `sizes`, and per-combination `variants` inventory.
- Time-window and stock-quota product discounts, plus reusable coupon codes.
- Card-to-card payment with receipt upload and a payment-deadline timer
  (bank-gateway path stubbed and hidden).
- Optional size-guide module (measurements → suggested size).
- Optional Telegram admin bot (Telegraf, webhook, env-gated).
- Optional admin reports/charts with Excel export (`REPORTS_ENABLED`).
- Optional token-gated database backup/restore tool with weekly auto-backup.
- Replaceable notification layer (`server/lib/notifier.js`) — console channel
  by default, `setChannel()` to plug in a provider.
- Neutral demo data seed (`npm run seed` / `npm run seed:reset`): demo
  categories, colors, hero slides, 8 demo products, one demo coupon, and the
  first super-admin.
- Standard open-source project files: MIT `LICENSE`, `README`, `CONTRIBUTING`,
  `CODE_OF_CONDUCT`, `SECURITY`, `THIRD-PARTY-NOTICES`, `.env.example`,
  `.gitignore`.

### Notes
- UI is Persian-first and RTL. Full internationalization (fa/en dictionaries,
  locale switch) is Roadmap Phase 2.
- No automated test suite yet; validated with a scripted end-to-end smoke test
  against an in-memory MongoDB.
