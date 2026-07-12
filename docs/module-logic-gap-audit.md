# Dotz Wars Module Logic Gap Audit

Date: 2026-07-12
Scope: current `src/` implementation vs your latest implementation spec.

## Progress Tracker

- [x] Phase 1: Read all active modules under `src/`
- [x] Phase 2: Compare actual behavior vs spec (confirmed + open decisions)
- [x] Phase 3: Produce module-by-module gap doc

### Migration (behavior → spec)

- [x] Step 1: Sim tick reshape (Idle/Marching/Fighting/Routing field + shared context stubs; behavior-preserving)
- [x] Step 2: Morale + Routing transitions (+ mage → diplomat)
- [ ] Step 3: Territory encirclement BFS + consequences
- [ ] Step 4: City healing radius
- [ ] Step 5: Money + map (income, connectors, upkeep, supply gate)
- [ ] Step 6: Vision / fog module
- [ ] Step 7: Render / UI / shortcuts for new systems
- [ ] Ongoing: determinism fixes, TeamId generalization, main.ts cleanup (before net)

---

## 1) How current logic differs from your spec

## Cross-cutting differences

- `sim` purity is partial, not full:
  - `sim` does not import `render`, `net`, or `input` (good).
  - But `step(...)` is not `tick(state, inputs, dt)`: it is `step(state, map, radius, dt, formations?)`, and user input is handled outside sim in `main.ts`.
  - Determinism is not guaranteed yet:
    - `cities/tickProduction` defaults to `Math.random()` for spawn point.
    - `sim/step` uses module-level mutable `nextProjectileId` (outside `GameState`).
- Terrain is already implemented and deeply integrated (`map/terrain.ts`, pathing speed multipliers, water blocking), while your spec says terrain is explicitly out-of-scope for now.
- Current win condition is "one team owns all cities", not ">= 80% city control".
- No `vision/` module exists yet.

## `sim`

- Current per-tick order differs from your proposed order:
  - Current: chase -> formation march -> movement -> separation -> direct combat -> projectile flight -> city capture -> production -> territory HP drain -> territory recompute -> winner check.
  - Spec target: movement -> territory ownership -> off-territory bleed -> morale drain/regen -> city heal -> routing resolve -> economy -> win check.
- Direct unit-vs-unit combat is already implemented (`sim/combat.ts`) with melee/ranged/projectiles.
- Morale system does not exist.
- Routing behavior at 0 morale does not exist.
- Match/player count is fixed effectively to two teams (`blue`/`red`) in shared types.

## `territory`

- Influence falloff is already implemented as quadratic (`strength * (1 - d/r)^2` until radius), not TBD.
- Ownership uses grid sampling (`TERRITORY_CELL`) and naive per-cell summation over all sources.
- Encirclement logic is not implemented.
- Off-territory damage currently scales by overwhelm and nearby buddies; there is no separate encirclement multiplier/rule.
- Border is rendered as hard cell seam lines (matches hard-line goal, but grid-discrete).

## `units`

- Current roster is 5 archetypes (`scout`, `grunt`, `archer`, `mage`, `tank`), not 2 classes (light/heavy).
- Unit stats are class-level constants in unit files, not centralized in `shared/config.ts`.
- No `morale` stat.
- No diplomat unit.
- HP drain from enemy influence exists, but direct combat damage also exists (both systems active).

## `cities`

- Cities support capture boxes and production queues (already beyond current spec baseline).
- No city healing radius or heal tick exists.
- No per-city projection strength in map data; city influence is global constants (`CITY_INFLUENCE_STRENGTH`, `CITY_INFLUENCE_RADIUS`).
- No city supply cap/starvation behavior.

## `money`

- Economy is currently a starting-gold ledger + purchase/refund.
- No continuous city income tick.
- No connector/resource income.
- No upkeep tick.
- No upkeep shortfall behavior.

## `map`

- Static map exists and includes terrain regions (forest/mountain/water), which conflicts with "terrain excluded for now".
- No connector/resource point model.
- No map editor.
- City spawns are fixed in code (`cities/spawns.ts`), not authored as a richer map format.

## `formation`

- Module is already fully designed and implemented (shape layouts, registry, march logic, detach/rejoin behavior).
- This differs from spec saying formation is undesigned.

## `input`

- Baseline drag-select + move is present.
- Also includes pan mode, formation-facing gesture, city selection interactions.
- Input vocabulary is already larger than spec baseline.

## `net`

- Inert (`src/net/.gitkeep` only). This matches your "defer multiplayer" direction.

## `render`

- Read-only rendering from state is respected.
- Border hard-line rendering exists.
- Interpolation between sim ticks exists.
- No fog-of-war rendering, no vision integration, no broken/routing visual treatment.

## `shared`

- Many tunables are in `shared/config.ts`, but not all:
  - Unit combat stats live in unit classes.
  - Some behaviors still rely on inline constants/logic in module files.
- `TeamId` is hardcoded to `"blue" | "red"` (implies fixed 2-player model).

## `shortcuts`

- Not undesigned in code: shortcuts are implemented (mode switching, clear selection, control groups, formation commands).

## `ui`

- Not undesigned in code: toolbar, gold HUD, city production menu, formation menu are implemented.
- Still no finalized HUD architecture for morale/diplomat/fog because those systems do not exist yet.

## `main.ts`

- Currently owns significant orchestration logic for input interpretation and issuing sim commands.
- Not just thin wiring; includes gameplay command routing and state transitions.

---

## 2) Current logic vs doc intent (what already aligns)

## Fully or mostly aligned

- `sim` does not depend on `render`/`input`/`net`.
- Separate sim/render clocks exist in runtime loop (`TICK_DT` + render interpolation).
- Territory is computed, not hand-authored, from city/unit influence.
- Border is drawn as a clear hard line (not soft gradient).
- Off-territory HP loss exists and is tied to enemy ownership pressure.
- Cities are strategic ownership points and can flip control.
- `render` is read-only with respect to game state.
- `net` is deferred/inert.

## Partially aligned

- Shared constants pattern exists, but not complete centralization.
- Single-player feel exists, but both teams are currently user-selectable for testing.
- Formation exists but is not yet calibrated against your intended bleed/overextension game feel.

## Not aligned yet (major)

- Win condition rule.
- Morale + routing system.
- Diplomat system.
- Vision/fog module.
- Resource connectors + continuous economy + upkeep.
- Terrain scope (currently included but spec says exclude).
- Deterministic/pure sim constraints.

---

## 3) Questions you need to resolve (blocking decisions)

These are the highest-impact unresolved decisions to unblock convergence.

## A. Core architecture decisions

1. **Combat model finalization**  
   Keep both systems (direct combat + territory bleed), or strip direct combat and make territory bleed-only?

2. **Terrain scope**  
   Keep current terrain/pathing system as part of v1, or remove/defer terrain to match spec?

3. **Sim purity target**  
   Must sim be strictly deterministic now (move RNG seed + projectile id into state), or acceptable as temporary?

4. **Win condition**  
   Confirm replacing "all cities" with ">=80% cities" immediately.

## B. Territory/system math

5. **Influence performance strategy**  
   Keep current grid sampling and tune `TERRITORY_CELL`, or move to accelerated approach (spatial partition / cached field / lower-frequency recompute)?

6. **Encirclement rule**  
   Add explicit encirclement detection and a multiplier, or keep overwhelm-only bleed?

## C. Unit model decisions

7. **Roster model**  
   Migrate to only light/heavy, or keep 5-class roster and map light/heavy concept onto it?

8. **Morale/routing**  
   Add morale as independent stat + routing state now, or postpone until combat/economy lock?

9. **Diplomat**  
   Confirm adding diplomat as unit subtype vs separate entity, and confirm healable or not.

## D. Cities + economy decisions

10. **City healing**  
    Define heal radius + rate and whether city healing is only HP or also morale.

11. **City supply cap/starvation**  
    Choose exact cap behavior and starvation mechanics.

12. **Income model**  
    Confirm city continuous income rate and connector/resource model timing for implementation.

13. **Upkeep failure behavior**  
    Decide between production stall, attrition/starvation, debt, or hard no-spawn rules.

## E. Map and scope decisions

14. **Map data contract**  
    Define canonical map format: cities, starts, connectors/resources, optional per-city projection values.

15. **Map editor scope**  
    In v1 or deferred.

## F. UX/input decisions

16. **Formation gameplay intent**  
    Does formation tightness impact influence strength and/or bleed survivability?

17. **Input vocabulary freeze**  
    Finalize command set for diplomat signals + city targeting before refactoring input schema.

18. **UI information hierarchy**  
    Prioritize HUD blocks for funds, morale, routing, fog/vision, diplomat signals.

---

## Suggested implementation order (to minimize rework)

1. Lock combat model + terrain scope + win condition.
2. Lock deterministic sim contract (`tick(state, inputs, dt, rng)` shape and state-owned counters).
3. Add `vision/` module contract (types first, render adapter second).
4. Decide and implement morale/routing + diplomat type.
5. Implement economy (income/upkeep/connectors) after above systems are fixed.
6. Reconcile formation/input/ui with finalized systems.

---

## Quick reality check summary

- Current codebase is not "missing systems"; it is a different game slice already implemented (RTS micro-combat with terrain + formations + city production/capture).
- Your spec is a newer direction emphasizing territory/morale/vision/economy as primary.
- Main risk is not blank modules; it is **design divergence** and potential rewrite churn unless the high-impact decisions above are fixed first.
