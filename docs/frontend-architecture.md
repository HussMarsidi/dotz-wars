# Frontend Architecture Guide

A guide for building the game client. **This document defines structure and rules, not implementation.** Follow it exactly. Do not write game logic here — write it in the files this guide points to.

Stage: single-player first. Multiplayer (Colyseus) is added later without rewriting the simulation. Every rule below exists to protect that.

---

## 1. The one rule that matters

The game is split into three layers that do not know about each other:

- **`sim`** — pure game logic. Given state and inputs, produces the next state. Nothing else.
- **`render`** — reads `sim` state and draws it (PixiJS). Never changes state.
- **`net`** — feeds inputs into the sim and syncs state out (Colyseus, added later).

**Dependency law:**

```
sim     → imports NOTHING from render, net, or input
render  → may import from sim (read-only)
net     → may import from sim
input   → produces plain input data; imports nothing from render/net
```

If `sim` imports PixiJS, the network, the DOM, or the clock, the design is broken. This law is what lets `sim` move to the server untouched. Enforce it with lint (see §6), not just discipline.

---

## 2. Determinism (non-negotiable for `sim`)

Inside the simulation:

- **No `Math.random()`.** Randomness comes from a seeded RNG passed in as part of the tick. Same seed + same inputs = same result.
- **No `Date.now()` / `performance.now()` / timers.** Time is the fixed tick delta, passed in.
- **No I/O, no network, no DOM, no logging side effects.**

A tick is a pure function of `(state, inputs, dt)`. This is what makes the sim (a) testable without a browser and (b) safe to run authoritatively on the server later. Any violation forfeits both.

---

## 3. Loop contract

Two separate clocks. Do not merge them.

- **Tick (simulation):** fixed timestep, e.g. **20 Hz**. Advances game state. Framerate-independent.
- **Frame (render):** whatever the display runs at (~60 fps). Reads the latest state and **interpolates** between the last two ticks for smooth motion.

Game logic lives only in the tick. Rendering never mutates state. The interpolation written now is the same code that later smooths networked state updates — it is not throwaway.

---

## 4. File structure

```
src/
  sim/                pure game logic — no pixi, no net, no dom
    state.ts          the GameState shape (data only)
    step.ts           advance one tick: pure function
    rules.ts          dot flow, ownership, win/lose conditions
    collision.ts      circle-circle checks
    vector.ts         Vector2 math
    rng.ts            seeded random source
  render/             pixi only, reads sim state
    renderer.ts       owns the pixi app + stage
    dot-view.ts       maps a sim dot → a sprite, interpolates
  input/              capture player intent → plain Input objects
    input.ts
  net/                empty for now; colyseus client later
  shared/
    types.ts          GameState, Input, and other cross-layer contracts
    config.ts         ALL tuning constants (see §5)
  main.ts             wires layers together, runs the loop
```

`shared/` exists so that `types.ts` and `config.ts` can later be shared between client and server. Keep anything cross-boundary here.

---

## 5. Tuning constants

Every magic number lives in `shared/config.ts` — tick rate, dot speed, spawn rate, capacities, board size, colors-by-owner. Nothing hard-codes a number inline. If a value affects how the game feels or plays, it belongs here so it can be tuned in one place.

---

## 6. Testing

The payoff of the layering: **`sim` is pure, so it is fully unit-testable without a browser.**

- **Tool:** Vitest.
- **Cover:** `step.ts`, `rules.ts`, `collision.ts`, `vector.ts`. Given a known state + inputs + seed, assert the next state.
- **Determinism test:** run the same `(state, inputs, seed)` twice, assert identical output. This guards the §2 rules automatically.
- **Do not test** `render` or `net` with unit tests — those are integration concerns for later.

If a piece of game logic is hard to test, it's usually because it leaked out of `sim`. Move it back.

---

## 7. Tooling: Biome

Biome handles both lint and format (one tool, replaces ESLint + Prettier).

- Format on save; lint in CI-of-one (a pre-commit or a script) later.
- **Enforce the §1 boundary via lint:** restrict imports so files under `sim/` cannot import from `render/`, `net/`, `input/`, `pixi.js`, or DOM globals. This turns the architecture's core rule into a mechanical check instead of a hope.
- Keep the config minimal — recommended rules on, plus the import restriction. Don't accumulate rule tweaks.

---

## 8. What is deliberately NOT here

To stay focused, this guide omits — and you should not add yet:

- Multiplayer / Colyseus wiring (the sim is being kept portable _for_ it; that's enough for now).
- Physics engine (hand-rolled vector math only).
- State-management libraries (the sim owns its own plain state).
- UI frameworks (HUD/menus are plain HTML/CSS over the canvas).
- ECS (start with plain arrays/classes; only introduce if profiling demands it).
- Git workflow, CI, deployment.

Add these when the game actually needs them, not on spec.
