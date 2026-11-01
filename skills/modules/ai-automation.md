# Release & versioning skill

## Goal

Provide a consistent release process that supports change tracking and safe deployment.

## Standard release checklist

- define scope of change
- choose major/minor/patch
- update changelog
- document migration if required
- tag the version
- test on the current environment
- invalidate relevant caches

## Version management in this repo

The project is already a good example of release-friendly architecture: modular services, clean boundaries, and plain documentation. This makes it easy to version by module or by feature set.

## Reusable rule

If a repository has a public API, UI impact, config change, or admin behavior change, treat it as version-worthy and document it.
