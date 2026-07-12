# Manual test checklist — migration Steps 1–7

Play on `main` after pull. Local team is **blue**. Gold HUD top-left shows balance + net `/s`.

---

## Core combat / morale / routing (Steps 1–2)

- [ ] Select units, move — pathing and arrival still work
- [ ] Fight enemy — **HP bar (green)** and **morale bar (cyan)** both visible under units
- [ ] Melee hurts HP more than arrows; **arrows chip morale hard**, HP lightly
- [ ] Archers’ own morale does **not** drop just from shooting
- [ ] Morale hits 0 → unit **routes** (warmer tint, deselected, flees toward friendly city, ignores move orders)
- [ ] Out of combat / near city → morale recovers; control returns after exit threshold (~40)
- [ ] City menu trains **Diplomat** (letter `D`), not Mage; diplomats never attack

## Encirclement (Step 3)

- [ ] Hard to force casually: if a unit is on **own** territory cut off from all friendly cities, morale drains while idle and orange ring may show when encircled
- [ ] Units on enemy/neutral ground are never “encircled”

## City heal (Step 4)

- [ ] Damage a blue unit, walk it into a blue city aura (~110 world units)
- [ ] HP regenerates; morale snaps to full (routing ends if they were fleeing)
- [ ] Enemy city’s aura does not heal your units

## Economy + map (Step 5)

- [ ] Gold HUD changes over time (`+/- X/s`) even when idle (city income − upkeep)
- [ ] Map shows **gold resource nodes** (center + 4 connectors) mid-map
- [ ] Owning connector territory (push influence over connectors) increases income
- [ ] At **0 gold**, city buy is blocked
- [ ] City with too many nearby friendlies + queue (≥ supply cap 12) cannot produce more

## Fog (Step 6–7)

- [ ] Dark fog over unexplored map; dim over explored; clear where blue units/cities see
- [ ] Enemy units hidden until in **visible** fog; appear when a scout/diplomat/city reveals them
- [ ] Diplomats have a noticeably larger vision radius
- [ ] After leaving an area, it stays **explored** (dim), not black again

## Visual cues (Step 7)

- [ ] Routing units: warmer tint
- [ ] Encircled (if you create a pocket): orange ring
- [ ] Morale + HP bars always on living units

## Still not in this pass (known gaps)

- [ ] Diplomat preset signals UI (stub only)
- [ ] Determinism (RNG / projectile ids) — before multiplayer
- [ ] `TeamId` beyond blue/red
- [ ] `main.ts` orchestration cleanup

---

## Suggested smoke path (~5 min)

1. Start game → confirm fog + gold `/s` + resource markers  
2. March blue into red → fight → watch morale bars / routing flee home  
3. Heal at blue city  
4. Open city buy → train diplomat → confirm no attack + big vision  
5. Push toward a mid-map resource → watch income tick up  
