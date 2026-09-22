# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: plain HTML, CSS, and JavaScript in a Chrome Manifest V3 extension. This keeps the project dependency-free, locally installable on Windows, and easy to audit.

## Users

The primary user is a Chinese student or early-career job seeker completing repetitive online application forms in Chrome on Windows.

## Product Purpose

Provide a local reusable information library beside application forms. The user focuses a form field, the extension recognizes the nearby field label, locates likely matching saved entries, and lets the user click once to insert a chosen value.

## Positioning

Unlike a clipboard-history monitor or a broad job-tracking suite, this product is a deliberate form companion. Profile storage remains local; an optional user-configured AI endpoint receives only the selected card text after explicit confirmation. The extension never submits an application automatically.

## Operating Context

- Used while completing recruitment forms in Chrome on Windows.
- Opened explicitly by clicking the extension action.
- The user first focuses a field in the page, then confirms a suggested saved entry before insertion.
- Data may be added through nine structured profile modules or explicitly pasted into the sidebar.

## Capabilities and Constraints

- Chrome Manifest V3 extension.
- Local profile data and no project backend, account, or analytics. Optional AI compression sends the selected card only after explicit confirmation. Optional AI field matching is disabled by default and sends only field hints and entry labels to the user-configured HTTPS endpoint when enabled and the sidebar is open.
- Required permissions: `activeTab`, `scripting`, and `storage`; AI endpoint host access is optional and requested per configured origin.
- No clipboard monitoring, screenshots, OCR, application tracking, job scraping, or automatic submission.
- Supports nine default profile modules, repeatable education and experience records, custom fields, search, grouped sidebar display, deletion of legacy cards, and JSON backup.
- Optional fields are omitted from storage and the sidebar when blank.
- AI compression previews the exact source, enforces a user-selected character limit, and requires review before filling or saving a new card. It never overwrites the original.
- Recognizes labels from semantic labels, accessibility attributes, placeholders, names, ids, and nearby text.
- High-confidence matches are highlighted, never inserted without a user click.
- Falls back to copying when a page control cannot be filled safely.
- Ordinary text inputs, textareas, and contenteditable fields are the first-version target. Specialized date pickers, selects, upload controls, cross-origin frames, and closed shadow roots are not guaranteed.

## Brand Commitments

Pastory is a reference for compact card-based retrieval and direct manipulation. Autumn Job Assistant is a functional reference for focus tracking and web-form insertion. The product must remain visually quiet and task-oriented rather than reproducing either project wholesale.

## Evidence on Hand

- Public Pastory repository: https://github.com/nothingbutcici/pastory
- Public Autumn Job Assistant repository: https://github.com/ljkss/autumn-job-assistant-tracker
- No user profile data or fabricated resume content may ship as real data. Demonstration entries must be clearly marked as examples.

## Product Principles

1. Local by default, with explicit opt-in for each AI transmission.
2. User confirmation before every form mutation.
3. Minimal permissions and no passive collection.
4. Fast retrieval during repetitive form completion.
5. Graceful fallback when a website resists direct insertion.

## Accessibility & Inclusion

Keyboard navigation, visible focus states, readable Chinese interface text, reduced-motion support, and sufficient color contrast are required.
