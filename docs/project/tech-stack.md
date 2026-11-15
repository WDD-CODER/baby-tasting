# TECH STACK — AUTHORITATIVE SOURCE — baby-tasting
> `AGENTS.md` and `CLAUDE.md` defer to this file. Edit HERE only.

## Stack
- Frontend / framework: Angular
- Backend: Node / Express / MongoDB
- Deploy: (not set) (database: (not set))

## Hard conventions
- State: signals only (`signal()`, `computed()`), no `BehaviorSubject`
- Build gate: `npm run build` must pass before any commit.
- Lint gate: `npm run lint` must pass before milestone sign-off.
- Test gate: `npm run test`.
- Add the rules that are specific to this project below; stack-wide rules live in `docs/agent/standards-*.md`.

## Approved dependencies
Anything already in `package.json` is approved. New dependencies need explicit Plan Contract approval before they are installed.
