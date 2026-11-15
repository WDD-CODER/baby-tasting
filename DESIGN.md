# DESIGN.md — baby-tasting design rules

Source: `docs/briefs/00-program.md` section 6. Hebrew only, RTL, dark only. Every reviewer checks UI changes against this file.
All values live in `src/styles/tokens.scss`; no colour literal appears anywhere else (INV-5, `tools/check-no-hex.mjs`).

## Colour tokens

| Token | Value | Use |
| --- | --- | --- |
| `--color-canvas` | `#020617` | page background |
| `--color-surface` | `#0f172a` | cards, top bar, bottom navigation, sheets |
| `--color-surface-raised` | `#1e293b` | raised cards, buttons, toasts |
| `--color-text` | `#f1f5f9` | primary text |
| `--color-text-secondary` | `#94a3b8` | secondary text, labels, hints |
| `--color-border` | `#334155` | borders and dividers |
| `--color-accent` | `#4f46e5` | primary button, focus border |
| `--color-accent-border` | `#6366f1` at 30% | accent ring, focus outline |
| `--color-on-accent` | `#fff` | text on accent and danger fills |
| `--color-backdrop` | `#020617` at 70% | behind sheets and dialogs |
| `--color-tier-bad` | `#E5484D` | errors, danger, locked, alert |
| `--color-tier-okay` | `#F5A623` | introducing |
| `--color-tier-good` | `#46A758` | maintenance |
| `--color-tier-great` | `#30A46C` | great tier |
| `--color-cat-nutrition` | `#F6C9A8` | nutrition category |

## Typography

Heebo via `@fontsource/heebo`, weights 400, 500, 700, 800, fallback `system-ui`. Tokens: `--font-family`; sizes `--fs-xs` 12px, `--fs-sm` 14px, `--fs-md` 16px, `--fs-lg` 20px, `--fs-xl` 24px; weights `--fw-regular`, `--fw-medium`, `--fw-bold`, `--fw-black`.

## Spacing, radius, touch

`--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px, `--space-5` 20px, `--space-6` 24px, `--space-7` 32px, `--space-8` 48px. Radius: `--radius-card` 16px, `--radius-sheet` 24px, `--radius-pill` 999px. Touch target `--touch-target` 44px minimum. Shadow `--shadow-sheet`. Logical CSS properties only. Layout at 360px first.

## Allergen marking

- Accent ring: 2px `--color-accent-border`.
- Badge: 18px circle at the item's inline-end top corner.
- introducing = `--color-tier-okay`; maintenance = `--color-tier-good`; locked = `--color-tier-bad` with 🔒; alert = `--color-tier-bad`.

## Item states

planned = outline; given = filled + ✓; skipped = 50% opacity + line-through; suggested = dashed outline.

## Shared components (`src/app/shared/ui/<name>/`, selector `app-<name>`)

| Component | Inputs / outputs |
| --- | --- |
| `button` | variant primary / secondary / ghost / danger; size md / lg; disabled; loading; fullWidth; output `pressed` |
| `icon-button` | icon (emoji), ariaLabel (required), variant; output `pressed` |
| `card` | raised |
| `bottom-sheet` | open, title; output `closed`; closes on backdrop and Escape; focus trap |
| `chip` | tone neutral / accent / okay / good / bad; selected; removable; outputs `pressed`, `removed` |
| `alert-strip` | alerts `{ id, tone, text, actionLabel? }[]`; output `act(id)`; scrolls inside itself only |
| `confirm-dialog` | title, body, confirmLabel, cancelLabel, destructive; outputs `confirmed`, `cancelled` (used through `ConfirmDialogService`) |
| `empty-state` | icon, title, actionLabel; output `action` |
| `loading-state` | none |
| `error-state` | message; output `retry` |
| `text-field` | label, hint, error, type; `ControlValueAccessor` |
| `select` | label, options `{ value, label }[]`; `ControlValueAccessor` |
| `toast` | host for `ToastService` messages; auto-hide 4 s |

`/dev/components` (non-production builds) shows every one in its variants.

## Do / Don't

- Do take every colour, size and radius from a token; don't write a colour literal in a component.
- Do reuse a shared component; don't build a one-off button, card or sheet. A new visual piece joins the shared set first.
- Do read every string from `HE` in `src/app/core/i18n/he.ts`; don't write Hebrew inline in a template.
- Do use `margin-inline-start`, `padding-block`, `inset-inline-end`; don't use `left`, `right`.
- Do give every list an empty state with one action, and every request loading and error states.
- Don't scroll horizontally at 360px (the week view and the alert strip's own row aside).

## Open design decisions

- D-1: `--color-on-accent` (#fff) and `--color-backdrop` added as tokens, since text on accent fills and dialog backdrops need a colour section 6 does not name — reverse: remove the tokens and use `--color-text` / a surface colour.
- D-2: the inactive bottom tab is `--color-text-secondary` with a greyscale icon; the active tab is `--color-text`, bold, full-colour icon — reverse: change `.tab--active` in `shell.scss`.
- D-3: the top bar is 56px, sticky, `--color-surface`, with the app name at the inline-start and the baby slot at the inline-end — reverse: edit `shell.scss`.
- D-4: font sizes are tokens `--fs-xs … --fs-xl` (12, 14, 16, 20, 24px) — reverse: change the values in `tokens.scss`.
- D-5: the confirm dialog is a centred card (not a sheet); destructive confirmation uses the danger button — reverse: switch the dialog to `app-bottom-sheet`.
- D-6: toasts stack above the bottom navigation and auto-hide after 4 s — reverse: edit `toast.ts` / `toast.scss`.
- D-7: the unsaved-changes prompt uses the destructive confirm style for "לצאת" — reverse: pass `destructive: false` in `unsaved-changes.guard.ts`.
- D-8: the baby slot in the top bar is empty until a later plan fills `ShellService.babyLabel` — reverse: none needed.
