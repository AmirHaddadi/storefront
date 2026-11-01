# DevOps & delivery skill

## Goal

Deliver stable deployments and predictable environments.

## Rules

- one source for config
- keep secrets out of version control
- define env-specific behavior
- provide health checks and logs
- maintain a release checklist

## This repo example

This repo already shows useful devops patterns:

- `.env.example` for configuration
- optional backup logic
- optional Telegram integration
- environment-gated feature flags

## Standard checklist

- env variables documented
- app starts locally with clear instructions
- deployment steps documented
- backup or restore flow exists where needed
- logs are structured enough for debugging
