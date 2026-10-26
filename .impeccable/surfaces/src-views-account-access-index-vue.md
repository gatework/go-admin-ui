---
version: 1
slug: "src-views-account-access-index-vue"
primary_target: "src/views/account-access/index.vue"
related_targets: ["src/views/account-access/access-shell.vue","src/views/login/index.vue","src/views/login/components/login-form.vue","src/views/login/components/login-appearance-settings.vue","src/views/login/components/ambient-background.vue","src/utils/login-appearance.ts","src/views/login/components/mfa-challenge.vue","src/views/profile/components/mfa-settings.vue","src/views/admin/sys-config/registration-policy.vue"]
---

# Account access

## Context
motor Go administration frontend. On 2026-10-26 the user confirmed the current Ruby Motor authentication appearance at `/Users/wenwu.yan/Works/ruby/motor` as the reference for login, registration and password recovery. The read-only shell reference is `/Users/wenwu.yan/Works/ruby/motor/frontend/src/views/sys-mgmt/authentication/access-shell.vue`. The user also approved real Go backend integration, `arco-design-vue` frontend/backend branches and Docker development. Public registration defaults off, enabled by an administrator; ordinary registered identity receives no admin grants. Local email validation uses Mailpit, not production SMTP. Broader network-business capabilities remain unconfirmed in `PRODUCT.md`.

## Mode
Operate. Code-led refinement of the existing Arco/Motor authentication surface, preserving incumbent tokens, factual target copy, native components, stored preferences and API/MFA contracts. The user-supplied reference pins the direction; no new world, generated comp, visual metaphor or raster asset is required.

## Direction
One shared shell for login, registration, recovery and reset. Task title, explanation, visible field labels, one primary action, error/success feedback and return to login. Small lowercase motor/M brand and compact palette/layout/language/theme toolbar. Desktop keeps the reference's story/form composition; the form is a continuous surface rather than an elevated card. The reference's CSS background remains auth-local. Profile security still uses a divided section, not nested cards. TOTP QR and recovery codes carry real function, no decorative illustration.

## Structure
`/login`, `/register`, `/forgot-password` and `/reset-password` share `AccessShell`. Password login switches to the existing MFA challenge; the login registration shortcut is hidden during that challenge. Profile password panel owns enrollment and recovery-code management. Administrator system settings owns registration policy. These profile/admin security surfaces retain their existing scope and are not included in the current auth-shell visual refinement.

## Responsive and states
Desktop uses `minmax(420px, 0.9fr) minmax(520px, 1.1fr)` (approximately 45/55 with sufficient width), a 72px header and a 420px form; registration uses 460px. Left/right/center layout preferences remain stored. At 1120px and below the story and layout selector collapse; short-screen content scrolls inside the form workspace. At 520px and below the brand reduces to M, registration name fields stack, and form/tool controls are at least 44px; coarse pointers also receive 44px targets. Normal desktop controls are 36px. The email-code row stacks at 360px and below.

Existing theme and locale tokens remain authoritative. Auth-only shades derive from the selected Arco palette; helper/placeholder/footer text uses text-2 within this shell. Native input accessible names, visible focus, skip-to-form focus without hash-route replacement, palette arrow-key navigation/Escape/focus return, submit loading guards and closed/unconfigured/error/expiry states remain required. Registration/reset passwords are validated as 12–72 UTF-8 bytes, with confirmation. Email challenges are bound to the normalized email and stale responses are ignored. No password or MFA challenge is persisted in browser storage.

## Quality bar
Registration binds verification to email. Reset confirms password and ends at login. MFA does not issue JWT before verification; recoveries are shown once and downloadable. Preserve those security contracts while refining appearance.

Current auth evidence is in `.impeccable/review/account-alignment/`: desktop/mobile captures, login/register/forgot light and dark, 320px dark English registration, tablet recovery, left/center layouts, real registration/mail/reset success states, plus yellow-dark and mint-light samples. `contrast-check.json` contains 7 selectable palettes × 2 schemes for the sampled login text and normal/hover/active primary-button states. `text-button-contrast.json` separately covers the enabled native text-button variant in 14 palette/theme combinations, including normal/hover/active; `forgot-success.png` was recaptured for that correction. These matrices must not be generalized to every component or disabled state. The latest `finish-review.md` owns the visual verdict; this brief does not freeze a pass or claim whole-surface shipment.

`docs/ACCOUNT_ALIGNMENT_VALIDATION.md` records Docker frontend/Go/PostgreSQL checks, 400 unit tests, 51 browser regressions and the real local account chain. This documentation pass reuses that evidence without rerunning it. Local Mailpit delivery does not verify production SMTP; remote CI, production migration/deployment and wider network-business functionality remain outside this evidence. The inherited synchronous reset-email timing limitation remains documented in the backend account-access notes.

## Direction contract

THESIS: Make email verification and second-factor proof legible as separate steps, each with a clear completion and recovery path.

OWN-WORLD: Follow the pinned Ruby Motor authentication shell, preserve native Arco controls, motor surface/text/primary tokens, lowercase motor/M, footer and existing theme/layout/language preferences. Derive readable auth shades locally without changing the saved palette. Existing profile security remains divided and quiet.

STORY: The visitor verifies an email, creates or recovers an account, and then protects login with an authenticator and saved recovery codes.

FIRST VIEWPORT: Desktop uses a supporting story column and a 420px form (460px registration), a 72px header and compact toolbar. At 1120px and below the form becomes the only column; the primary action follows the fields and remains reachable through the inner workspace scroll.

FORM: Task-focused forms and explicit challenge states, extending the incumbent system with factual target copy and unchanged API/MFA contracts. No new concept seed or approved comp; this is a reference-led refinement.

FINISH: Root `DESIGN.md` and `.impeccable/design.json` record the incumbent tokens and auth-local rules. Keep the exact current outcome in the finish review and validation record. No new shipping raster was introduced; screenshots are evidence, not product assets.
