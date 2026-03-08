# Project Intent Notes

This file explains the "why" behind major decisions so future edits stay consistent.

## Product Goal

- This is a portfolio site with one homepage and four case-study pages.
- Primary UX goal: strong first impression + clear project storytelling.
- Technical goal: static-host friendly pages that still feel app-like (modal, transitions, lightbox).

## Core Files

- `index.html`: homepage structure, shared scripts/styles, modal shell.
- `main.js`: runtime behavior (hero intro, modal content loading, lightbox, scroll reveals).
- `styles.css`: global design tokens + all component styles + intro/fallback behavior.
- `cases/*.html`: case-study source content loaded directly and also into modal.

## Beginner Reading Order

- Step 1: Open `index.html` to see the page skeleton and script/style includes.
- Step 2: Open `styles.css` and review `:root` tokens first.
- Step 3: Open `main.js` and find these functions in order:
  - `renderCase` (how modal content is loaded)
  - `openModal` / `closeModal` (UI state transitions)
  - `openFromHash` (deep-link behavior)
  - `mm.add(...)` (desktop/mobile animation decisions)
- Step 4: Open one `cases/*.html` file to understand the content format injected into modal.

## Hero Intro Strategy

- Desktop (`>= 721px`): uses boot intro flow (`.page.boot-hidden`) to control reveal timing.
- Mobile default: non-blocking startup to avoid black-screen failures.
- Mobile test mode: `?mobileIntro=1` enables a lighter hero intro animation path.

## Modal Case Studies

- Case links point to `cases/*.html` files.
- JS fetches external case HTML and injects it into modal for app-like browsing.
- If fetch fails (or `file://`), fallback is iframe so content still opens.

## Analytics

- GA tag is included in every HTML entry page (`index`, `404`, and each `cases/*.html`).
- Reason: direct route visits should still be tracked on static hosting.

## Editing Conventions

- Keep accessibility hooks intact: `aria-*`, skip link, focus return on modal close.
- Keep cache-bust query params on `styles.css`/`main.js` updated when needed.
- If changing intro behavior, verify both desktop and mobile startup paths.
