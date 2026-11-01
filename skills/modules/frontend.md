# Backend delivery skill

## Goal

Deliver maintainable API and business logic.

## Standard rules

- validate all inputs
- keep errors domain-specific
- separate HTTP layer from service logic
- use explicit auth checks per action
- keep endpoints thin

## Checklist

- route exists and is mapped to a service
- request validation is present
- errors return consistent response shape
- permission control is enforced
- logs or traces are available
- response contract is documented

## This repo example

This project uses a clean backend shape:

- Express app with route groupings
- service layer for ordering, products, settings, users
- model layer for Mongo/Mongoose schema
- admin auth and permission checks split by concern

## Reusable backend pattern

```text
HTTP request
  -> route
  -> validation
  -> service
  -> model / database / external call
  -> response
```

## Recommended additions

- request id for tracing
- structured JSON logs
- standard error object
- audit trail for critical actions
