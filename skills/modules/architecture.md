# Cache system & invalidation strategy

This skill handles caching as a standard delivery layer for all project repositories.

## Core principles

- cache the data that is slow, expensive, or frequently reused
- avoid serving stale data after admin updates
- keep invalidation explicit and predictable
- do not cache mutable data by default

## Cache categories

### 1. Static asset cache

Use for:

- CSS
- JS
- images
- built frontend assets

Rules:

- versioned filenames
- hash-based busting
- keep long TTL for immutable content

### 2. API response cache

Use for:

- products list
- categories
- settings
- public read-only endpoints

Rules:

- short TTL for frequently changing content
- use cache tags or entity keys
- clear on product/category setting update

### 3. Database/read-through cache

Use for:

- config objects
- site settings
- lookup tables
- reference data

Rules:

- update cache when admin modifies the source document
- set stale-while-revalidate flow when appropriate

### 4. Session and auth cache

Use for:

- user session summary
- permission maps
- role lookups

Rules:

- do not cache privileged data too long
- clear on logout, change in permissions, or role update

## Invalidation rules

When any of these events happen, clear the relevant cache:

- product added/updated/deleted
- category changed
- coupon changed
- settings edited
- admin permission changed
- version release with public behavior changes

## Recommended pattern

```text
write -> update source -> invalidate cache tags -> rehydrate on next read
```

## Practical usage in this repo

This project already has a natural separation between:

- `server/models/` for source data
- `server/services/` for business logic
- `server/lib/` for shared infrastructure

That is ideal for a consistent cache layer. For example:

- settings updates trigger cache flush
- product edits invalidate list and detail caches
- role changes invalidate auth permission snapshots

## Implementation rule

Keep cache keys tied to domain identity, such as:

- `product:<id>`
- `category:list`
- `settings:site`
- `admin:permissions:<userId>`

This keeps invalidation simple and predictable.
