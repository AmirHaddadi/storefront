# Architecture & module boundaries

## Goal

Keep the app understandable, extensible, and safe to evolve.

## Standard pattern

- Routes: request parsing and HTTP boundaries
- Services: business logic
- Models: data contracts and validation shape
- Lib: shared infrastructure
- Integrations: optional channels such as Telegram or external providers

## Recommended boundaries in this repo

```text
server.js
└── server/
    ├── app.js
    ├── routes/
    ├── services/
    ├── models/
    ├── lib/
    ├── telegram/
    └── scripts/
```

## Rules

- routes never hold business logic
- services are reused by multiple entry points
- models define data shape and expected validation
- infrastructure logic belongs in `lib/`
- outside integrations stay isolated and optional

## Vitrine mapping

This repository demonstrates a clean modular monolith style and is a good base for a reusable skill system. It shows how a project can present:

- business services
- auth access
- admin panel
- public storefront
- optional integrations
- version system and release notes

## Reuse pattern across repos

When reusing this design in another repo:

1. map route flow
2. define service boundaries
3. isolate shared infra
4. keep optional integrations optional
5. create a repo vitrine doc
