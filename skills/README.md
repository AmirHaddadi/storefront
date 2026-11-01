# Storefront Modular Vitrine Skill Kit

This repository now includes a reusable, modular skill package designed for cross-project delivery.

The kit is split into three layers:

- Core Skills: reusable technical logic
- Stack Adapters: project-specific mappings
- Vitrine Layer: overview, maps, and a fast-access registry

This kit is intentionally built to be reusable across multiple repositories while staying compatible with this project's structure.

## Quick access

- Core overview: [skills/README.md](skills/README.md)
- Versioning system: [skills/core/versioning.md](skills/core/versioning.md)
- Cache strategy: [skills/core/cache-system.md](skills/core/cache-system.md)
- Module registry: [skills/registry.json](skills/registry.json)
- Vitrine overview: [vitrine/README.md](vitrine/README.md)
- Capability map: [vitrine/capability-map.md](vitrine/capability-map.md)

## Use pattern

1. Pick a skill from the registry.
2. Apply the stack adapter for your framework.
3. Inject the project rules, versioning policy, and cache strategy.
4. Publish the result to the Vitrine layer.

## Included modules

- Architecture
- Backend delivery
- Frontend delivery
- Data & persistence
- DevOps & environment
- Security
- Release & versioning
- Cache system
- AI-assisted delivery

## Current repo fit

This repo already matches the structure expected by the kit:

- `server/` for business logic and routes
- `server/models/` for data contracts
- `server/lib/` for infrastructure utilities
- `public-html/` for storefront and admin views
- `README.md` for product architecture documentation

This makes it an ideal test ground for the Vitrine Skill Kit before reusing it in other repositories.
