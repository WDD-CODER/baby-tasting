# Project Brief — baby-tasting

A mobile-first Hebrew (RTL) web app for two parents to plan and record their baby's food tasting: which food is given
on which day and in which meal, with strict tracking of allergen introduction and allergen maintenance. It is a
planning and tracking tool: it gives no medical advice and never decides for the parents; every rule is a default
the parents can see and change in Settings.

## Stack

Angular + Node / Express / MongoDB. Deployed to Render (one Web Service), production data in MongoDB Atlas.
Authoritative detail: `docs/project/tech-stack.md`.

## Core goals

- Plan foods per day and per meal in a calendar, which is the home screen and the place almost everything is done.
- Record what was given, including history for past dates, entered by hand.
- Track allergen introduction and maintenance strictly, with alerts the parents can act on.

## Hard constraints

- Two parents, one household, one baby in v1; sign-in by username only (allowed names from `APP_USERS`).
- Hebrew-only RTL UI; works at 360px width.
- No real baby data is ever seeded in code.
- Probably merged into Baby Tracker later: domain rules framework-free in `server/domain/`, database access only in
  `server/repositories/` (program document, section 7).

## Scope areas

The program document `docs/briefs/00-program.md` is the source of product decisions; briefs 1–9 in `docs/briefs/`
cover foundation, sign-in, catalog, calendar, allergen engine, suggestions, reactions and locks, status and settings,
and deploy.

## Where else to look

- Hard rules and skill triggers: `AGENTS.md`
- Path-scoped conventions: `docs/agent/*.md`
- Current work / in-flight state: the plan's Execution Notes, `.claude/todo.md` — **not** this brain.
