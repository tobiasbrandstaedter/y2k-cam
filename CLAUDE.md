# y2k

Private retro camera editor. Photos and videos get the look of early-2000s Digicams, Camcorders, Handykameras and Einwegkameras. Mobile web app, installed as PWA.

## Target platform

- iOS Safari, iOS 17 and newer. Nothing else is tested or supported.
- Installed to the home screen as a PWA. Must work offline after first load.
- Everything runs on the device. No server logic, no database, no tracking, no third-party services at runtime. Static hosting only.

## Source of truth

`PRODUKTVISION.md` is the product definition. Every requirement has an ID (IM-1, BB-4, LK-2, BS-11, EX-3, UX-7, QA-9). Reference these IDs in stories, ADRs, commits and tests so work stays traceable to the vision.

The vision is written in German and uses German domain terms. Keep them as they are in code, comments and docs: Look, Look-Familie, Variante, Baustein, Preset, Datumsstempel, Zeitreise-Modus. Do not translate them.

## Docs layout

```
PRODUKTVISION.md        product vision, owned by the user
docs/decisions/         ADR-NNN-short-title.md, one decision per file
docs/backlog/           user stories, one file per story, named by requirement ID
docs/looks/             reference sheet per Look-Familie (what the real device did)
docs/testing/           device test checklists and performance measurements
```

## Agents

Specialist agents live in `.claude/agents/`. Pick the one whose area the task falls into. The architect goes first on anything that touches stack or structure; nobody adds a dependency before `docs/decisions/ADR-001-stack.md` exists.

| Agent | Area |
|---|---|
| architect | stack evaluation, technical spikes on iOS, ADRs, project skeleton |
| backlog | turns the vision into user stories with acceptance criteria |
| ui | screens, navigation, touch controls, Look gallery |
| filters | the Look pipeline for still images, Bausteine, Look definitions |
| video | decode, per-frame processing, encode and export of video on iOS Safari |
| pwa-ios | manifest, service worker, offline, storage, share sheet, iOS Safari quirks |
| qa | tests, acceptance checks against the vision, device test checklists |

## Code conventions

Follow the user's global CLAUDE.md. In short: code, comments and docs in English, German domain terms untouched, no em or en dashes anywhere, simplest thing that works, no abstraction for a single use.
