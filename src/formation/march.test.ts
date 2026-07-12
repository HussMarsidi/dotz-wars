import { describe, expect, it } from "vitest";
import type { MapDefinition } from "../map/types";
import type { GameState } from "../shared/game-state";
import { emptyTerritory } from "../territory";
import { createInitialFog } from "../vision";
import { Grunt, Scout, Tank } from "../units";
import {
	formationMinSpeed,
	issueFormationMove,
	tickFormationMarches,
} from "./orders";
import { createFormationRegistry } from "./registry";

const openMap: MapDefinition = {
	id: "open",
	width: 800,
	height: 800,
	regions: [],
	resources: [],
};

/** Vertical water strip — a wide line will clip it while the centroid stays on land. */
const waterStripMap: MapDefinition = {
	id: "water-strip",
	width: 800,
	height: 800,
	regions: [
		{
			terrain: "water",
			shape: "ellipse",
			center: { x: 400, y: 200 },
			radiusX: 40,
			radiusY: 120,
		},
	],
	resources: [],
};

function stateOf(...units: GameState["units"]): GameState {
	return {
		units,
		cities: [],
		territory: emptyTerritory(1, 1),
		projectiles: [],
		gold: { blue: 1000, red: 1000 },
		diplomatLockout: { blue: 0, red: 0 },
		fog: createInitialFog(1, 1),
		winner: null,
	};
}

describe("formationMinSpeed", () => {
	it("uses the slowest living member", () => {
		const registry = createFormationRegistry();
		const tank = Tank.spawn("t", "blue", { x: 0, y: 0 });
		const scout = Scout.spawn("s", "blue", { x: 40, y: 0 });
		const formation = registry.create("line", ["t", "s"], { x: 1, y: 0 });
		expect(formationMinSpeed(stateOf(tank, scout), formation)).toBe(tank.speed);
	});
});

describe("tickFormationMarches", () => {
	it("keeps relative slots while advancing at the slowest pace", () => {
		const registry = createFormationRegistry();
		const tank = Tank.spawn("t", "blue", { x: 100, y: 100 }); // 100
		const scout = Scout.spawn("s", "blue", { x: 140, y: 100 }); // 240
		const grunt = Grunt.spawn("g", "blue", { x: 180, y: 100 }); // 160
		let state = stateOf(tank, scout, grunt);
		const formation = registry.create("line", ["t", "s", "g"], { x: 1, y: 0 });

		state = issueFormationMove(
			state,
			registry,
			formation,
			{ x: 500, y: 100 },
			openMap,
			10,
			{ x: 1, y: 0 },
			{ assemble: true },
		);

		const before = state.units.map((u) => u.position);
		// One second at tank speed 100 → ~100 world units of anchor travel.
		state = tickFormationMarches(state, registry, openMap, 10, 1);

		const after = state.units;
		const t = after.find((u) => u.id === "t");
		const s = after.find((u) => u.id === "s");
		const g = after.find((u) => u.id === "g");
		expect(t).toBeDefined();
		expect(s).toBeDefined();
		expect(g).toBeDefined();

		// Line facing +x → slots spread on Y; spacing preserved.
		const dyTS = Math.abs((t?.position.y ?? 0) - (s?.position.y ?? 0));
		const dySG = Math.abs((s?.position.y ?? 0) - (g?.position.y ?? 0));
		expect(dyTS).toBeCloseTo(formation.spacing, 0);
		expect(dySG).toBeCloseTo(formation.spacing, 0);

		// Whole group advanced roughly tank speed (not scout speed).
		const midBefore =
			((before[0]?.x ?? 0) + (before[1]?.x ?? 0) + (before[2]?.x ?? 0)) / 3;
		const midAfter =
			((t?.position.x ?? 0) + (s?.position.x ?? 0) + (g?.position.x ?? 0)) / 3;
		expect(midAfter - midBefore).toBeCloseTo(tank.speed, 0);
	});

	it("does not snap positions when issuing a normal move", () => {
		const registry = createFormationRegistry();
		const a = Grunt.spawn("a", "blue", { x: 100, y: 105 });
		const b = Grunt.spawn("b", "blue", { x: 140, y: 98 });
		const c = Grunt.spawn("c", "blue", { x: 175, y: 102 });
		let state = stateOf(a, b, c);
		const formation = registry.create("line", ["a", "b", "c"], { x: 1, y: 0 });

		state = issueFormationMove(
			state,
			registry,
			formation,
			{ x: 500, y: 100 },
			openMap,
			10,
			{ x: 1, y: 0 },
		);

		expect(state.units.find((u) => u.id === "a")?.position).toEqual({
			x: 100,
			y: 105,
		});
		expect(state.units.find((u) => u.id === "b")?.position).toEqual({
			x: 140,
			y: 98,
		});
		expect(state.units.find((u) => u.id === "c")?.position).toEqual({
			x: 175,
			y: 102,
		});
	});

	it("peels water-blocked members while the rest keep marching", () => {
		const registry = createFormationRegistry();
		// Already in a line spread on Y so a wing clips water without assemble-snap.
		const ids = ["a", "b", "c", "d", "e"] as const;
		const units = ids.map((id, i) =>
			Grunt.spawn(id, "blue", { x: 320, y: 20 + i * 40 }),
		);
		let state = stateOf(...units);
		const formation = registry.create("line", [...ids], { x: 1, y: 0 }, 40);

		state = issueFormationMove(
			state,
			registry,
			formation,
			{ x: 600, y: 100 },
			waterStripMap,
			10,
			{ x: 1, y: 0 },
		);

		// March until someone peels (slot hits water) or we give up.
		let peeled = false;
		for (let i = 0; i < 40; i++) {
			state = tickFormationMarches(state, registry, waterStripMap, 10, 0.25);
			const current = registry.get(formation.id);
			if ((current?.march?.detachedIds.length ?? 0) > 0) {
				peeled = true;
				break;
			}
		}
		expect(peeled).toBe(true);

		const march = registry.get(formation.id)?.march;
		expect(march).not.toBeNull();
		// Formation still marching (not frozen by water).
		expect(march?.path.length ?? 0).toBeGreaterThan(0);

		const detached = new Set(march?.detachedIds ?? []);
		const marching = registry.marchingUnitIds();
		for (const id of detached) {
			expect(marching.has(id)).toBe(false);
			const unit = state.units.find((u) => u.id === id);
			expect(unit?.path.length ?? 0).toBeGreaterThan(0);
		}
		// At least one member still locked in the march.
		expect([...ids].some((id) => marching.has(id))).toBe(true);
	});
});
