# Contributing to Storefront

Thanks for your interest in improving Storefront. Contributions of all
sizes are welcome — bug fixes, documentation, UI/UX polish, tests, new
integrations, and the internationalization work described in the README
roadmap.

## Getting started

1. Fork and clone the repository.
2. `npm install`
3. `cp .env.example .env` and set `MONGODB_URI` + `INITIAL_ADMIN_TOKEN`.
4. `npm run seed` then `npm start`.
5. Create a branch: `git checkout -b fix/short-description`.

## Ground rules

- **Scope.** Keep pull requests focused. One logical change per PR.
- **No new heavy dependencies** without discussion first — the project is
  deliberately framework-free and lightweight. No front-end build step,
  no bundler, no CSS preprocessor.
- **Respect the layers.** HTTP handling in `server/routes/`, business logic in
  `server/services/`, data shape in `server/models/`, infrastructure in
  `server/lib/`. Anything the admin API and the Telegram bot both use belongs
  in a service.
- **Front end.** Check `public-html/assets/css/components.css` for an existing
  component before adding styles. Keep the CSS load order
  (`tokens → base → components → layout`). Use absolute asset paths.
- **Style.** Match the surrounding code. Existing in-code comments are in
  Persian; keep a file internally consistent.
- **Secrets.** Never commit `.env` or any real credential, token, phone
  number, email, or customer data. Use fictional demo values
  (`demo@example.com`, `09000000000`, `Demo Store`).

## Before opening a PR

- `npm run check` passes.
- Manually walk through the storefront **and** the admin panel for anything
  your change touches (there is no automated test suite yet — adding one is a
  very welcome contribution).
- Update `README.md` / `CHANGELOG.md` if behavior or setup changed.

## Commit messages

Short, imperative subject line (English or Persian). Reference an issue number
when there is one.

## Reporting bugs and ideas

Open a GitHub issue with clear steps to reproduce (for bugs) or a concise
description of the use case (for ideas). For security issues, follow
[SECURITY.md](SECURITY.md) instead of opening a public issue.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
