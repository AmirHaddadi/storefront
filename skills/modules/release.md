# Security & access control skill

## Goal

Protect the app without making every feature difficult to grow.

## Standards

- enforce auth at the boundary
- use role and permission checks
- validate all user inputs
- do not trust client-side state alone
- log sensitive operations

## This repo examples

- admin auth flow
- role-based access control
- permission checks for admin panel actions
- OTP-based customer auth flow
- secure config usage patterns

## Reusable list

- authorize every write action
- verify ownership or role before mutation
- avoid secret leakage in logs
- keep access checks consistent across route and service layers
- protect admin-only flows and high-risk actions

## Release-aware security

Any change that affects auth, RBAC, admin permissions, or exposed endpoints must be treated as a security-sensitive release.
