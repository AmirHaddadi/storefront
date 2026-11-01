# Frontend delivery skill

## Goal

Keep the UI understandable, fast, and suitable for reuse.

## Standards

- keep templates, styles, and logic separated
- use a component or section pattern
- avoid hidden logic in markup
- make routes predictable
- preserve RTL/LTR compatibility when relevant

## This repo example

This project is intentionally framework-free and keeps the frontend simple:

- `public-html/` contains page files
- `assets/css/` hosts the design system
- `script.js` and `admin.js` handle client logic

This is a strong example of a low-complexity frontend architecture that is easy to maintain.

## Reusability pattern

- define page skeletons
- create reusable UI patterns
- centralize design tokens
- keep client logic small and domain-aware

## Good checklist

- use stable selectors
- avoid duplication
- keep JS small and readable
- reduce hidden state
- ensure accessibility and keyboard navigation
