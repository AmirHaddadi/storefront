# Versioning & release system

This skill defines the standard version and release flow used by the Vitrine Skill Kit.

## Standard

Use Semantic Versioning:

- MAJOR: breaking changes
- MINOR: backward-compatible features
- PATCH: fixes and small updates

Example:

- `1.0.0` initial stable version
- `1.3.0` new feature set
- `1.3.1` bug fix or patch

## Release flow

1. Define scope
2. Decide change type: major/minor/patch
3. Update changelog
4. Create release note
5. Tag the version
6. Trigger deployment pipeline if applicable
7. Invalidate cache if app behavior changed

## Suggested rule for project delivery

- feature change → `MINOR`
- bug fix → `PATCH`
- architecture rewrite or breaking API → `MAJOR`
- config or env format changes → `MINOR` or `MAJOR` depending on compatibility

## Example release note

```md
## [1.4.0] - 2026-10-31

### Added
- modular skill registry
- docs and vitrine map
- cache and release guideline

### Changed
- app architecture clarified
- service boundaries are now documented

### Fixed
- release notes accessibility
```

## Cache-aware versioning

When a change affects public behavior, versioning and cache invalidation must be paired.

Use:

- versioned API routes when needed
- content hashing for static files
- cache tags on entities or collections
- automatic invalidation after patch or release

## Rule of thumb

- If the user sees a change, version it.
- If the system cache could serve stale data, invalidate it.
- If a migration is needed, add migration note to the release.

## Repo compatibility

This repository already follows a clean separation of layers; that makes it suitable for patching the version system without disturbing the business logic.
