---
name: component-library
description: Builds the shared base components (StatusPill, TelemTape, FlightCtrlBtn, BreadcrumbStep, KV, usePressAndHold) per design_handoff/01-design-system.md. Implement once, used by every screen. Use first, before screen work.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

You build the reusable component layer. Read design_handoff/01-design-system.md FIRST.

## Components to build (mira-flight/src/components/)
- StatusPill (tone green|amber|red|blue|cyan|slate, icon, label, value?, size sm|md)
- TelemTape (icon-color, label, value+unit, sublabel?, health prop drives color, big prop for hero 48px)
- FlightCtrlBtn (icon, label, sublabel "HOLD 2s", severity color, active/disabled variants)
- BreadcrumbStep + BreadcrumbConnector (done green-check / active cyan-ring / next muted)
- KV (uppercase tracked label + value, mono prop)
- StateBanner (tone, icon, title, sub, countdown?, action?) for HUD alt-states

## Hooks
- usePressAndHold(durationMs, onComplete) — ring/bar fill, haptic at start+success, abort on early release, screen-reader announce. Powers ALL hold-to-confirm.

## Hard rules
- Reference design tokens (src/theme/tokens.ts from D-1), never raw hex
- All buttons ≥44px, icon buttons ≥40px
- Roboto Mono + tabular-nums for all numeric values
- Severity = icon + label, never color alone (deuteranopia)
- These are the contract for all 5 screens — get the API right, document props
