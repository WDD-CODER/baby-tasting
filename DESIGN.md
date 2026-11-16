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
| `--color-event-nutrition` | `#3B82F6` | bottle feeding events |
| `--color-event-breast` | `#0EA5E9` | breastfeeding events |
| `--color-event-diaper` | `#14B8A6` | diaper events |
| `--color-event-sleep` | `#6366F1` | sleep events, the open-sleep pill |
| `--color-event-sleep-great` | `#A855F7` | an excellent sleep cycle (45 min or more) |
| `--color-event-activity` | `#F59E0B` | activity events |
| `--color-event-weight` | `#EC4899` | weight events |
| `--color-event-pumping` | `#D946EF` | pumping events |
| `--color-event-vomiting` | `#FB7185` | vomiting events |
| `--color-event-supplement` | `#10B981` | supplement (Bio Gaya) events |
| `--color-awake-ok` / `-soon` / `-bath` / `-over` | `#EAB308` / `#F97316` / `#F59E0B` / `#F43F5E` | the awake-time widget states |
| `--color-nap-window` | `#3730A3` | the midday nap window banner |

## Typography

Heebo via `@fontsource/heebo`, weights 400, 500, 700, 800, fallback `system-ui`. Tokens: `--font-family`; sizes `--fs-xs` 12px, `--fs-sm` 14px, `--fs-md` 16px, `--fs-lg` 20px, `--fs-xl` 24px; weights `--fw-regular`, `--fw-medium`, `--fw-bold`, `--fw-black`.

## Spacing, radius, touch

`--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px, `--space-5` 20px, `--space-6` 24px, `--space-7` 32px, `--space-8` 48px. Radius: `--radius-card` 16px, `--radius-sheet` 24px, `--radius-pill` 999px. Touch target `--touch-target` 44px minimum. Shadow `--shadow-sheet`. Logical CSS properties only. Layout at 360px first.

## Allergen marking

- Accent ring: 2px `--color-accent-border`.
- Badge: 18px circle at the item's inline-end top corner.
- introducing = `--color-tier-okay`; maintenance = `--color-tier-good`; locked = `--color-tier-bad` with 🔒; alert = `--color-tier-bad`.
- Badge ordinal: a given item of an introducing allergen shows `n/N` (its ordinal among the allergen's given days) in a `--color-tier-okay` pill, bold; a maintenance allergen's item shows a plain `--color-tier-good` dot; every other allergen item keeps the neutral dot.
- State chips (`app-chip`): `טרם התחיל` and `הסתיים` neutral, `בחשיפה` okay tone, `בתחזוקה` good tone.
- Alert rows: a 4px `--color-tier-bad` bar at the inline-start, text, chevron at the inline-end; at most 3 rows, then `+N נוספות`.

- Lock badge (plan 007): a locked food's or allergen's calendar tile gets the 18px badge `🔒` on a `--color-tier-bad` fill (any food, not only allergens); the `/allergens` state chip reads `🔒 נעול` in the bad tone and `/foods` rows show `🔒`.
- 101 notice (plan 007): a sticky card at the top of the reaction page, 2px `--color-tier-bad` border, bold bad-coloured text, shown while `קושי בנשימה` or `חמור` is chosen.
- Photo thumbnails (plan 007): 72px squares with `--radius-card` and `object-fit: cover` (56px in the reactions list), a 28px round `✕` at the inline-end top corner of a form thumbnail.

## Item states

planned = outline; given = filled + ✓; skipped = 50% opacity + line-through; suggested = dashed outline.

Calendar tile (plan 004): 32px emoji inside a 44px touch target; allergen = 2px accent ring plus an 18px neutral badge dot at the inline-end top corner; given shows a small ✓ at the inline-start bottom corner.

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
| `icon` | `slot` (a key of `ICON_SLOTS`) or `name` (a fixed Material Symbols name); size 20 / 24 / 32; filled; decorative (`aria-hidden`) |

## Icons (plan 009)

- One library: **Material Symbols Rounded**, self-hosted from the `material-symbols` package (the rounded font only, imported in `src/styles.scss`). No emoji or other icon set for new UI icons.
- Every icon the parents may change has a **slot** in `src/app/core/icons/icon-slots.ts` (`ICON_SLOTS`: slot key → default name, Hebrew label, group, keywords). Show it with `<app-icon [slot]="'nav.log'" />`; the household's override (`iconOverrides` in the Tracker settings) wins, else the slot default. A fixed icon (show/hide password) uses `name`.
- Sizes: 20 (inline with text), 24 (default: navigation, buttons), 32 (large actions). Outline by default, `filled` for an active or selected state.
- The name list `src/app/core/icons/icon-names.ts` and the server copy `server/domain/tracker/icon-names.js` (names + slot keys) are generated by `node server/lib/gen-icon-names.mjs`; rerun it after adding a slot or upgrading the package, and commit both files.

## Navigation (plan 009)

- Five bottom tabs, icon above label: `תיעוד` (`/`, slot `nav.log`), `ציר זמן` (`/timeline`, `nav.timeline`), `סטטיסטיקה` (`/stats`, `nav.stats`), `טעימות` (`/tasting`, `nav.tasting`), `הגדרות` (`/settings`, `nav.settings`). The active tab is `--color-accent` and bold; inactive `--color-text-secondary`.
- Tasting pages live under `/tasting` with a pill top-tab bar `יומן` / `מזונות` / `אלרגנים` (the active one filled with `--color-accent`).
- The top bar: app name at the inline-start, baby name and age, the signed-in parent's name as an outlined pill at the inline-end.

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
- D-2 (superseded by plan 009): the inactive bottom tab is `--color-text-secondary`; the active tab is `--color-accent`, bold (Material Symbols icons, no greyscale filter) — reverse: change `.tab--active` in `shell.scss`.
- D-3: the top bar is 56px, sticky, `--color-surface`, with the app name at the inline-start and the baby slot at the inline-end — reverse: edit `shell.scss`.
- D-4: font sizes are tokens `--fs-xs … --fs-xl` (12, 14, 16, 20, 24px) — reverse: change the values in `tokens.scss`.
- D-5: the confirm dialog is a centred card (not a sheet); destructive confirmation uses the danger button — reverse: switch the dialog to `app-bottom-sheet`.
- D-6: toasts stack above the bottom navigation and auto-hide after 4 s — reverse: edit `toast.ts` / `toast.scss`.
- D-9 (plan 008): the progress summary on `/foods` is a collapsible `details` card; each category row has a 6px bar filled with `--color-cat-nutrition` on a `--color-border` track — reverse: replace the bar with the `tried/total` text only.
- D-10 (plan 008): the rule values are plain number fields with the one-line explanation and the range (`min–max`) as the hint; out of range shows `טווח מותר: {min}–{max}` and disables `שמירה` — reverse: use a stepper component.
- D-8 (plan 005): the badge grows from an 18px circle to a pill (min 18px) so `2/3` fits — reverse: show a dot only and put the ordinal in the item sheet.
- D-9 (plan 005): an alert's suggested food is shown first in the add-food sheet under `מוצע` with an accent outline; it is not added until tapped — reverse: add it on the alert tap.
- D-10 (plan 006): a suggested tile is a 2px dashed `--color-accent` outline at 70% opacity, never draggable; tap opens a sheet with the reason and `אישור` / `הסרה`; the bar under the header shows `{n} הצעות` · `אשר הכול` · `בטל הכול` — reverse: edit `.suggested` in `week-view.scss` and `.suggest-bar` in `calendar-page.scss`.
- D-11 (plan 006): the foods page queue toggle is a round 48px button at the row's inline-end (➕ / ✓, accent border when queued) and the queue section `התור לטעימה` sits above the categories with a drag handle and a ✕ per row — reverse: edit `foods-page.html` / `.scss`.
- D-7: the unsaved-changes prompt uses the destructive confirm style for "לצאת" — reverse: pass `destructive: false` in `unsaved-changes.guard.ts`.
- D-8: the baby slot in the top bar is empty until a later plan fills `ShellService.babyLabel` — reverse: none needed.
- D-9: the week grid has a 56px label column and 7 columns of at least 56px, scrolling inside itself at 360px; today's column has an accent-border tint — reverse: edit `week-view.scss`.
- D-10: swiping the header area left goes to the next week or month, right to the previous (matching the arrows in RTL) — reverse: swap the sign in `calendar-page.ts` `swipeEnd`.
- D-11: the allergen badge is a neutral dot until plan 005 fills state colours — reverse: none needed.
- D-12 (plan 007): the 🔒 badge also shows on non-allergen foods (a locked regular food has no accent ring); `app-text-field` accepts `datetime-local` for the reaction time — reverse: show the badge on allergen tiles only in `item-tile.html`, drop the type from `text-field.ts`.
- D-13 (plan 007): a locked food row on `/foods` gets a 🔓 icon-button (release) at the inline-end only when the food itself is locked; a food locked through its allergen is released from `/allergens` — reverse: remove the button in `foods-page.html`.
- D-14 (plan 014): the icon picker is a bottom sheet: search field (English names), the slot's Latin keywords as chips, a 6-column virtual-scroll grid of 48px cells (the chosen icon on `--color-accent`), then `שמירה` and `איפוס לברירת מחדל`; `/settings/icons` lists the slots by group as rows of at least 48px — reverse: edit `icon-picker-sheet.*` and `icons-page.*`.
- D-15 (plan 014): the legend is a sub-screen shown in place on `/settings` (a `‹ חזרה להגדרות` button returns), not a route — reverse: add a `settings/legend` route.
- D-016 (plan 017): at phone width (< 600px) the week grid has a 20px meal-number column and 7 equal columns (no horizontal scroll), tiles fill their cell at 36px with 20px emoji, the `+` of an empty cell fills the cell (44px+ touch area), and the view chips and `הצע לי שבוע` share one row; from 600px the sizes return to the 56px label / 44px tile / 32px emoji of D-9 — reverse: edit the `--week-*` values in `week-view.scss`.
- D-017 (plan 017): a food without an icon (`emoji: ''`) shows `🍽️` everywhere (`foodIcon` / the `foodIcon` pipe, one constant in `src/app/core/utils/food-icon.ts`); the food form's icon field is a live search over the self-hosted `public/emoji-search.json` plus a first `ללא אייקון` option — reverse: re-add the free-text input in `emoji-picker.html`.
