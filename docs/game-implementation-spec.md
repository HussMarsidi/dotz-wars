# Implementation Spec — Final

Maps every design decision onto your actual `src/` folders. This version resolves the remaining logic gaps, including edge cases — the goal is that nothing load-bearing is left implicit.

**Tags used throughout:**
- 🔒 **LOCKED** — decided, build against this.
- 🟡 **PROPOSED DEFAULT** — my best answer to a real gap, not yet confirmed by you. Build against it unless you override; flagging it so you know it was a judgment call, not an obvious fact.
- 🔢 **TBD NUMBER** — logic is locked, only the tuning value is open. Not a design question, just needs playtesting. Lives in `shared/config.ts`.

---

## Cross-cutting rules

- 🔒 `sim` never imports from `render`, `net`, or `input`.
- 🔒 `sim` must be deterministic long-term (seeded RNG in state, no ambient `Date.now`/mutable module-level counters). Currently violated by `Math.random()` in city production and a module-level ID counter — accepted as debt for now, **must be fixed before the multiplayer step**, since "sim moves to the server unchanged" depends on it.
- 🔒 Fixed sim tick (~20Hz) + interpolated render frame (~60fps), never merged.
- 🔒 `TeamId` is currently hardcoded to 2 players (`"blue" | "red"`) — accepted as debt while core systems are being built, **must be generalized before any diplomat/alliance work**, since that layer only makes sense at 3+ players.
- 🔒 `main.ts` currently owns real gameplay orchestration (input interpretation, command routing, state transitions), not just wiring — accepted as debt, revisit alongside the determinism fixes above.
- 🔒 Every tunable numeric value lives in `shared/config.ts`, nowhere else.

---

## sim

Owns the authoritative tick; orchestrates every other module.

### Tick order 🔒
1. Recompute shared per-tick context once: territory ownership/border, vision, the encircled-unit set (see `territory`), which units are inside a friendly city's heal radius.
2. Each unit resolves its state against that context.
3. Run state-specific behavior.
4. Apply passive effects: healing, morale regen, city income/upkeep/production.
5. Win check.

### Unit state machine 🔒
States: `Idle`, `Marching`, `Fighting`, `Routing`.

| Transition | Trigger |
|---|---|
| `Idle`/`Marching` → `Fighting` | Enemy unit enters attack range |
| `Fighting` → `Idle`/`Marching` | No enemies remain in range, morale > 0 |
| Any state → `Routing` | Morale hits 0 |
| `Routing` → previous player control | 🟡 **Proposed:** morale regenerates above 0 (simplest threshold — can be tuned to a higher % later 🔢), **or** the unit reaches a friendly city's heal radius (which also instantly restores morale, since a city is the safe zone) |
| `Routing` while intercepted by an enemy | 🟡 **Proposed:** resolves as ordinary `Fighting` combat, no special penalty or bonus. The real cost of routing is losing player control (can't reposition, retreat further, or focus targets) — that's punishment enough without inventing a defenselessness rule. Once contact breaks, it resumes moving toward its target city. |
| `Routing` with no BFS-derived path home (broke while on enemy-owned or otherwise unreached ground) | 🟡 **Proposed:** move by straight-line heading toward the nearest known friendly city until the unit enters territory the encirclement BFS actually reached (see `territory`), then switch to following that BFS path exactly. Combat while doing this follows the same rule as above — ordinary combat if intercepted, nothing special. |

### Win condition 🔒
Control at least 80% of cities. No capital requirement, no designated capital city exists.

### Combat resolution 🔒
Direct contact combat (melee/ranged/projectile) is the **only** damage source. No passive damage from territory. Terrain and unit-type modifiers apply (currently uniform across all 5 archetypes — see `units`).

### Targeting / focus fire 🔒
No 1-on-1 pairing lock. Each unit independently targets the nearest valid enemy in range every tick. Multiple attackers can converge on the same target — this is what makes "outnumbered" or "encircled" actually dangerous; it's a consequence of this rule, not a separate mechanic.

**⚠️ Needs confirmation**
- Match size / player count — blocked on the `TeamId` generalization noted above.

---

## territory

Computes ownership, derives the border, resolves encirclement. Deals no damage.

### Ownership 🔒
- Every unit and city projects influence, strongest at center, fading with distance.
- Falloff: quadratic — `strength * (1 - d/r)^2` until radius `r`.
- Computed via grid sampling (cell size 🔢 tunable).
- At any cell, whichever side's summed influence is strictly higher owns it.
- **Tie edge case** 🟡 **Proposed:** exact ties resolve to neutral/unowned, not "last owner keeps it." Cleaner and fully deterministic — floating-point exact ties are rare but need one defined behavior, not an implicit one.
- **Border flicker** 🟡 **Proposed, optional, not blocking v1:** if cells near the seam flip ownership rapidly as units jostle, consider hysteresis (a cell must be newly-owned for N consecutive ticks before it visually/logically flips). Flag this as future polish if it turns out to be a problem in practice — don't pre-build it.

### Encirclement 🔒
- Detection: multi-source BFS/flood-fill from every friendly city, spreading through cells that player owns **and** neutral/unclaimed cells. Enemy-owned cells block the spread. Run once per player per tick (or throttled) — it's a graph traversal over the ownership grid you already compute, not a second expensive system.
- **A unit is flagged encircled only if it's standing on a cell it owns that the BFS didn't reach.** Units standing on enemy-owned or contested ground are never flagged encircled, no matter how surrounded — their fate there is decided purely by combat odds (see `sim` targeting rule). This is deliberate: no mechanic punishes solo pushes into enemy territory beyond the natural risk of being outnumbered.
- Consequences: no healing (implied — a cut-off pocket can't reach a connected city), extra morale drain even while idle (see `units`), incoming-damage penalty while fighting (new modifier axis, see `units`).
- Same BFS also produces, for any reached cell, which city it traces to and how many hops — this is the path source for `Routing` units (see `sim`).

**⚠️ Needs confirmation**
- If a city itself becomes disconnected from your main territory (surrounded), do units in *that* city's own heal radius still heal? 🟡 Proposed: yes, trivially connected to itself — interacts with supply cap once built.

---

## units

Stats, live state, per-tick transitions.

### Roster 🔒
5 archetypes: scout, grunt, archer, tank, diplomat (mage removed). All share the same terrain/type combat modifier for now — no per-archetype differentiation yet, revisit once the core loop is validated.

### HP 🔒
Decreases only from direct combat damage. No passive territory drain.

### Morale 🔒
- Separate stat from HP.
- Drains only while `Fighting` (in active combat) — regenerates when not fighting.
- **Exception:** an encircled unit drains morale even while idle, stacking with combat drain if it's also fighting.
- At 0 → enters `Routing` (see `sim` state machine).
- Encircled units also take an incoming-damage penalty while fighting (new entry in the terrain/type modifier pipeline).

### Healing 🔒
Condition: `unit.team == city.controllingTeam` AND `unit` is within that city's heal radius (geometric distance). Independent of the exact micro-cell ownership right at a contested city's edge — the city itself defines the safe zone, not the ground under each individual unit.

### Diplomat 🔒
Full behavior swap from the old mage slot, not a reskin:
- Cannot attack — never enters `Fighting`, so **normal combat morale drain never applies to it**. Only the encirclement idle-drain can push it toward `Routing` — a diplomat stuck behind enemy lines eventually breaks and flees home, same as any other unit.
- Zero territory projection.
- Cap of 2 per player, 20s train time, 5-minute replacement lockout after death.
- Large vision radius (🔢 number TBD, see `vision`).
- Killable normally.
- 🟡 **Proposed, closes an earlier open item:** healable under the same rule as every other unit — no reason to exclude it now that healing has one uniform condition.
- Can send unlimited free preset signals (ally / with-you / surrender-style).

**⚠️ Needs confirmation**
- Full stat numbers for all 5 archetypes and the diplomat (HP, damage, speed, cost, upkeep, projection, vision radius).

---

## cities

Production, income, healing.

### Confirmed 🔒
- Predefined per-city projection strength, set per map (🔢 values are map-authored data, not one global constant).
- Continuous money generation while held.
- Healing radius: fixed distance (🔢 tunable), not computed from the influence field — see the exact heal condition under `units`.
- All cities are treated identically — no capital, no special bonus/spawn/tiebreaker role.

### Supply cap 🟡 Proposed logic (number still 🔢 TBD)
Enforced as a **production gate**: a city simply cannot produce a unit that would push it over its cap. No retroactive starvation of units that already exist (e.g. from consolidating armies after losing another city). Simpler to implement, avoids needing a "who starves first" rule. Flag if you'd rather have the harsher retroactive-decay version instead.

---

## money

The funds ledger.

### Confirmed 🔒
- Cities generate income continuously while held.
- Resource connectors: 4 per resource, 25% each, income follows whoever owns the connector's point — same ownership rule as everything else, no separate capture system.
- Units cost ongoing upkeep, not just an upfront cost.
- Funds clamp at 0, never go negative.

### Upkeep shortfall 🟡 Proposed logic (numbers still 🔢 TBD)
Production stall: if funds can't cover it, you simply can't buy/produce new units. No debt, no forced starvation of existing units. Mirrors the supply-cap default above — economic pressure works by gating new production, not punishing what you already built.

---

## map

Static per-map data.

### Confirmed 🔒
- Resources are fixed points, 4 connector points each.
- Terrain: keep the current implementation (regions, pathing speed multipliers, water blocking) — not excluded, reversing the earlier draft of this spec.

**⚠️ Needs confirmation**
- Map size/format, city count, starting positions, map editor scope.

---

## vision *(new module)*

Owns sight radius rules and per-player fog state. `territory` owns objective ownership/border; `vision` owns what each player currently knows about it. `render` reads both, writes neither.

### Confirmed 🔒
- Fog is per-player, computed independently from that player's own units' and cities' vision radii.
- Diplomat has a larger radius than combat units (🔢 numbers TBD for all).

### Proposed model 🟡
Standard three-tier fog: **unexplored** (never seen) / **explored** (seen before, remembered but not live) / **visible** (currently in range of a friendly unit or city). This is the well-understood RTS default and supports the diplomat trust mechanic better than a flat binary visible/hidden — players can tell "I don't know what's there right now" apart from "I've genuinely never seen this."

**⚠️ Needs confirmation**
- Exact vision radius per archetype, per city, and for the diplomat.
- Whether a killed unit's vision disappears instantly or fades out.

---

## formation

Already implemented in code (shape layouts, registry, march logic, detach/rejoin).

**⚠️ Needs confirmation**
- Does formation tightness affect the influence field (tighter clump = more concentrated projection)?
- Movement speed relative to how fast a `Fighting` unit takes damage — sets how punishing overextension feels.

---

## input

Captures pointer/keyboard events into plain input data, decides nothing.

Already implemented beyond baseline: drag-select, move, pan, formation-facing gesture, city selection.

**⚠️ Needs confirmation**
- Full vocabulary once diplomat signals and city-targeting interactions are finalized.

---

## net

Deferred. Colyseus, self-hosted, TLS reverse proxy, PM2. Not built until sim/territory/cities/vision/economy/diplomat all work single-player. Currently inert — correct, no action needed.

---

## render

Read-only w.r.t. state. Hard-line border, tick interpolation — both already match spec.

**⚠️ Needs confirmation**
- Visual treatment for `Routing` units, diplomat signals, encirclement indication — none designed yet.

---

## shared

Cross-module types + the single tunable-constants file.

**⚠️ Needs confirmation**
- Every 🔢 value flagged throughout this doc — this file is the master list of numbers to fill in.

---

## shortcuts / ui

Both already implemented (mode switching, control groups, toolbar, gold HUD, production/formation menus). Will need extending once morale, diplomat signals, routing, and fog are live — no layout decided for those yet.

---

## main.ts

See cross-cutting rules — currently owns orchestration it shouldn't, accepted as debt.

---

## Master list of remaining open items

**🔢 Numbers only (logic is locked, just needs values + playtesting):**
- Grid cell size for territory sampling
- All 5 archetype + diplomat stats: HP, damage, speed, cost, upkeep, projection, vision radius
- City projection strength per city (map data)
- Supply cap number
- Healing radius + heal rate
- Morale regen threshold for exiting `Routing`
- City income rate, resource output rate
- Vision radii (per archetype, per city, diplomat)

**⚠️ Real open decisions:**
- Match size / player count (blocked on `TeamId`)
- Map format, city count, starting positions, editor scope
- Formation-affects-projection question
- Input vocabulary for diplomat signals + city-targeting
- HUD layout, hotkey behavior
- Killed-unit vision fade behavior

**🟡 Proposed defaults awaiting your confirmation (build against these unless overridden):**
- Routing exit condition (morale > 0, or reach a city)
- Routing-while-intercepted uses normal combat, no special penalty
- Routing-with-no-path falls back to straight-line until reaching BFS-covered territory
- Territory ownership ties resolve to neutral
- Supply cap and upkeep shortfall both act as production gates, not retroactive punishment
- Diplomat is healable like any other unit
- Disconnected city's own heal radius still works
- Three-tier fog model (unexplored/explored/visible)

**🔒 Fully locked this round:** win condition, combat resolution (direct-contact only), tick order + state machine, targeting/focus-fire rule, roster (5 archetypes + diplomat), terrain (kept), encirclement (BFS, own-territory-only), healing condition, diplomat's combat/morale interaction.
