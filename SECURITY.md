# Security Policy

## Supported versions

Storefront is an early-stage open-source foundation. Security fixes are applied
to the `main` branch. There is no long-term support branch yet.

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Report privately through GitHub's
["Report a vulnerability"](https://github.com/AmirHaddadi/storefront/security/advisories/new)
advisory form, or by contacting the maintainer privately via the contact
listed on <https://github.com/AmirHaddadi>.

Include:

- a description of the issue and its impact,
- steps to reproduce or a proof of concept,
- affected files or endpoints if known.

You will get an acknowledgement as soon as reasonably possible. Please allow
time for a fix before any public disclosure.

## Notes for operators

This project is a foundation, not a hardened product. Before deploying:

- Set a long, random `INITIAL_ADMIN_TOKEN`, run the seed once, then rotate it
  or create a new admin from the panel.
- Set strong random values for `TELEGRAM_WEBHOOK_SECRET` and `DB_BACKUP_TOKEN`
  if you enable those features; leave them empty to keep the features off.
- Serve the app over HTTPS and put it behind a reverse proxy.
- Never commit `.env`. Keep real credentials out of the repository.
- Point `UPLOADS_ROOT` and `DB_BACKUP_ROOT` at storage you control.
- Review authentication, rate limiting, and input validation for your own
  threat model — no guarantees are made about production readiness.
