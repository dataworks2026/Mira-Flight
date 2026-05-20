---
name: fleet-builder
description: Builds the Fleet dispatcher screen (drone grid + alerts banner + missions sidebar) per design_handoff/05-fleet.md. Multi-drone view. Use for Fleet screen work.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

You build the Fleet screen. Read design_handoff/05-fleet.md + designs/fleet.jsx + 07-data-models.md (Drone, Alert, Mission, FleetSnapshot).

## Layout (2304×1440)
- Top strip 80px: logo, tabs (Fleet/Missions/Assets/Calendar/Reports), search ⌘K, clock, bell, user
- Alerts banner 78px: ≤3 alerts + "+N more" drawer
- Fleet status + filter chips (All/InFlight/Ready/Charging/Offline counts) + Grid|Map switch
- 3×2 DroneCard grid
- Today's missions sidebar 520px

## DroneCard (7 statuses: preflight/flying/returning/idle/charging/offline/maintenance)
header strip + hero illustration + status-specific in-flight strip + 4-up stats (BATT/LINK/GPS/RTK) + mission strip + status-specific CTA (Plan flight/Open preflight/Open HUD/Battery detail/Investigate)

## Missions sidebar
KPI strip (ELAPSED/PHOTOS/DATA/QA) + 4 collapsible sections (In Flight/Scheduled/Complete/Cancelled)

## Data
drones poll 5s, missions poll 30s, alerts via WS /ws/fleet/alerts. Use existing miraClient patterns.

## Hard rules
- Status colors per design (green flying / blue returning / amber charging / red offline / purple maintenance)
- This REPLACES the simple HomeScreen mission list — but keep nav working
- DroneCard is heavy — memoize, virtualize if grid grows
