---
version: 1
slug: "src-views-account-access-index-vue"
primary_target: "src/views/account-access/index.vue"
related_targets: ["src/views/login/components/mfa-challenge.vue","src/views/profile/components/mfa-settings.vue","src/views/admin/sys-config/registration-policy.vue"]
---

# Account access

## Context
motor Go administration frontend. User requested registration, email password recovery and MFA based on /Users/crate/Works/ruby/motor. Public registration defaults off, enabled by an administrator; ordinary registered identity receives no admin grants.

## Mode
Operate. Code-led ordinary extension of the existing Arco/Motor login and profile, preserving incumbent tokens and components. No replacement visual world, no approved image comp.

## Direction
Direct vertical forms; task title, explanation, field labels, one primary action, error/success feedback and return to login. Existing brand/footer/theme/language controls. Profile security uses a divided section, not nested cards. TOTP QR and recovery codes carry real function, no decorative illustration.

## Structure
/register, /forgot-password, /reset-password share the public shell. Password login switches to MFA challenge. Profile password panel owns enrollment and recovery-code management. Administrator system settings owns registration policy.

## Responsive and states
375px single form column; desktop split story/form; tablet must fit 768px. Existing theme and locale tokens. Native input accessible names, keyboard focus, submit loading guards, closed/unconfigured/error/expiry states. No password or MFA challenge persisted in browser storage.

## Quality bar
Registration binds verification to email. Reset confirms password and ends at login. MFA does not issue JWT before verification; recoveries shown once and downloadable. Check 375/768/1440 screenshots, light/dark and English/Chinese, actual QR, validation and completion.

## Direction contract

THESIS: Make email verification and second-factor proof legible as separate steps, each with a clear completion and recovery path.

OWN-WORLD: Preserve Arco controls, motor surface/text/primary tokens, existing brand, footer and theme/language controls; use quiet divided security sections.

STORY: The visitor verifies an email, creates or recovers an account, and then protects login with an authenticator and saved recovery codes.

FIRST VIEWPORT: Desktop uses a supporting story column and a 420px form; mobile puts the task title and labeled fields in one column with the primary action after the fields.

FORM: Task-focused forms and explicit challenge states, extending the incumbent system. No new concept seed or approved comp; this is a code-led extension.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
