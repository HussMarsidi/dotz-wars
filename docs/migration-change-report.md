# Migration change report (high level)

Date: 2026-07-12  
Scope: Spec-driven migration Steps 1–7 on `main` (behavior → territory/morale/economy/vision game).

---

## Why

Codebase was an RTS micro-combat slice (direct combat, terrain, formations, city production). Spec reframes the game around **territory, morale/routing, economy, fog**, with diplomat replacing mage. Migration was phased to avoid double-wiring.

---

## What shipped

### Step 1 — Sim tick reshape
- Tick loop split into named stages + shared `TickContext`
- Units gained `state: idle | marching | fighting | routing` (derived each tick)
- Gameplay preserved; hooks for later systems

### Step 2 — Morale + Routing + Diplomat
- Morale stat; drain from **incoming hits only** (not from attacking)
- Melee vs ranged HP/morale damage split (arrows = low HP, high morale)
- Morale 0 → Routing (lose control, flee home); exit at threshold or city heal
- Mage → **Diplomat** (no attack, no territory projection, cap/lockout)

### Step 3 — Encirclement
- BFS from cities through own + neutral cells; enemy cells block
- Encircled = on **own** cell BFS never reached
- Idle morale drain + incoming HP damage penalty while encircled
- Routing prefers BFS home path when available

### Step 4 — City healing
- Geometric heal radius around same-team cities
- HP regen + full morale restore (ends Routing)
- Encircled units excluded

### Step 5 — Economy + map resources
- Continuous city income; resource nodes with **4 connectors** (25% each via territory ownership)
- Unit upkeep; gold clamps at 0
- Production gates: broke (0 gold) + per-city **supply cap**
- Gold HUD shows balance + net `/s`

### Step 6 — Vision / fog
- New `vision/` module; three-tier fog (unexplored / explored / visible)
- Per-team; city + unit vision radii (diplomat largest)
- Vision drops instantly on death

### Step 7 — Render / UI cues
- Fog overlay for local player; hide enemies outside visible fog
- Resource markers on map
- Routing tint; encirclement orange ring; HP + morale bars
- Diplomat signals remain stubbed (no HUD yet)

---

## Intentionally deferred (ongoing)

- Full sim determinism (`Math.random`, projectile id counter)
- `TeamId` generalization past blue/red
- Thinning `main.ts` orchestration
- Diplomat signal UI / net multipath

---

## How to verify

See [manual-test-migration.md](./manual-test-migration.md).

---

## Suggested narrative for stakeholder report

1. **Problem:** Design and code diverged; shipping features on the old pipeline would force rework.  
2. **Approach:** Refactor tick/state first, then layer morale → encirclement → heal → economy → fog → visuals.  
3. **Outcome:** Single-player loop now matches the locked spec spine (state machine, morale/routing, encirclement, heal, income/upkeep/connectors, fog). Tunables live in `shared/config.ts`.  
4. **Next:** Playtest numbers; then determinism + TeamId before multiplayer; diplomat signals when fog trust matters.
