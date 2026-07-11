import { describe, expect, it } from "vitest";
import type { MapDefinition } from "../map/types";
import type { GameState } from "../shared/game-state";
import { emptyTerritory } from "../territory";
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
};

function stateOf(...units: GameState["units"]): GameState {
	return {
		units,
		cities: [],
		territory: emptyTerritory(1, 1),
		projectiles: [],
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
});
