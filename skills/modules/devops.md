# Data & persistence skill

## Goal

Keep data ownership, schema evolution, and storage rules clear.

## In this repo

This project is built around MongoDB with Mongoose and a clean model-first approach:

- products, categories, users, orders, settings
- admin permission data and sessions
- metadata for media and reporting

## Standards

- keep schema and business logic separate
- validate at model boundary when needed
- avoid mixed concerns in a single collection
a keep an explicit migration strategy
- define read/write rules

## Reusable rules

- use one source of truth for the entity
- do not duplicate business logic in UI
- keep collection names predictable
- store only stateful information in DB
- separate config from runtime generated data

## Version-aware persistence

Any schema change should be treated as a release-worthy change and should include:

- migration note
- backward compatibility plan
- data validation rules
- cache invalidation if the data is cached
