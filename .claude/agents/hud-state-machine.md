---
name: hud-state-machine
description: Builds the HUD 10-state reducer and state-driven UI per design_handoff/02-hud.md. THE most safety-critical screen. Drone-authoritative state. Use for any HUD state/transition/alt-state work.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

You own the HUD state machine. Read design_handoff/02-hud.md + 07-data-models.md (HudState, HudVm) + designs/hud-altstate-configs.jsx FIRST.

## The 10 states
FLYING, PAUSED, RTH_ACTIVE, LOW_BATTERY, CRITICAL_BATTERY, LOST_LINK, GPS_DEGRADED, GEOFENCE_HOVER, OBSTACLE_BRAKE, MISSION_COMPLETE

## Reducer drives ALL regions
top-strip pill · pills (LINK/RTK/WIND/CLOUD/NOTICES) · telem health per field · battery block · GPS/RC footer · mission panel · center overlay · banner · control cluster (some disabled/ACTIVE/relabeled)

## Transition rules (from 02-hud.md — drone-authoritative)
- FLYING→LOW_BATTERY when batt≤25
- LOW_BATTERY→RTH_ACTIVE on 10s grace expiry OR pilot RTH
- LOW_BATTERY→FLYING if cancel within grace
- FLYING→CRITICAL_BATTERY when batt≤15 (no grace)
- FLYING→LOST_LINK when telemetry stale >4s
- FLYING→GPS_DEGRADED when sats<8 OR rtk≠FIX >2s
- GPS_DEGRADED→FLYING when recovered >5s (debounce)
- FLYING→GEOFENCE_HOVER on predicted breach <2s
- FLYING→OBSTACLE_BRAKE when vision <8m
- FLYING→MISSION_COMPLETE when all WPs captured

## Hard rules
- State is DRONE-AUTHORITATIVE — subscribe to drone/telemetry state, NEVER manufacture a state change without confirming telemetry packet
- Health thresholds from 01-design-system.md (battery/signal/sats/rtk/wind/vspeed/altitude functions)
- Copy the config object shape from hud-altstate-configs.jsx as the reducer case basis
- Banners for active-failsafe states NEVER auto-dismiss
- Don't break the existing MissionEngine — wire the reducer to its events
