import { describe, expect, it } from "vitest";
import { createCity } from "../cities";
import type { MapDefinition } from "../map/types";
import type { GameState } from "../shared/game-state";
import { emptyTerritory } from "../territory";
import type { Unit } from "../units";
import { Archer, Grunt } from "../units";
import { findClosestEnemy, tickCombat, tickProjectiles } from "./combat";
import { separateUnits } from "./separation";
import { checkWinner, interpolateState, issueMoveOrder, step } from "./step";

const map: MapDefinition = {
	id: "test",
	width: 200,
	height: 200,
	regions: [
		{
			terrain: "water",
			shape: "ellipse",
			center: { x: 150, y: 100 },
			radiusX: 40,
			radiusY: 40,
		},
		{
			terrain: "forest",
			shape: "ellipse",
			center: { x: 40, y: 50 },
			radiusX: 25,
			radiusY: 25,
		},
	],
};

const aroundWater: MapDefinition = {
	id: "around",
	width: 400,
	height: 200,
	regions: [
		{
			terrain: "water",
			shape: "ellipse",
			center: { x: 200, y: 60 },
			radiusX: 30,
			radiusY: 70,
		},
	],
};

const openMap: MapDefinition = {
	id: "open",
	width: 400,
	height: 400,
	regions: [],
};

const RADIUS = 10;

function stateOf(...units: Unit[]): GameState {
	return {
		units,
		cities: [],
		territory: emptyTerritory(1, 1),
		projectiles: [],
		gold: { blue: 1000, red: 1000 },
		winner: null,
	};
}

describe("issueMoveOrder", () => {
	it("sets target and path on selected units when destination is land", () => {
		const state = stateOf(
			Grunt.spawn("a", "blue", { x: 50, y: 50 }).copy({ selected: true }),
			Grunt.spawn("b", "blue", { x: 60, y: 60 }),
		);
		const next = issueMoveOrder(state, { x: 80, y: 50 }, map, RADIUS);
		expect(next.units[0]?.target).toEqual({ x: 80, y: 50 });
		expect(next.units[0]?.path.length).toBeGreaterThan(0);
		expect(next.units[1]?.target).toBeNull();
	});

	it("snaps a water destination to nearby land instead of ignoring the order", () => {
		const state = stateOf(
			Grunt.spawn("a", "blue", { x: 50, y: 50 }).copy({ selected: true }),
		);
		const next = issueMoveOrder(state, { x: 150, y: 100 }, map, RADIUS);
		const unit = next.units[0];
		expect(unit?.target).not.toBeNull();
		expect(unit?.path.length).toBeGreaterThan(0);
		// Water ellipse center is (150, 100) r=40 — snapped goal must sit outside it.
		const target = unit?.target;
		expect(target).toBeDefined();
		if (target === undefined) {
			return;
		}
		expect(Math.hypot(target.x - 150, target.y - 100)).toBeGreaterThan(40);
	});

	it("paths around water instead of a straight line through it", () => {
		const state = stateOf(
			Grunt.spawn("a", "blue", { x: 80, y: 40 }).copy({ selected: true }),
		);
		const next = issueMoveOrder(state, { x: 320, y: 40 }, aroundWater, 8);
		expect(next.units[0]?.target).toEqual({ x: 320, y: 40 });
		expect(next.units[0]?.path.length).toBeGreaterThan(1);
	});

	it("no-ops when nothing selected", () => {
		const state = stateOf(Grunt.spawn("a", "blue", { x: 50, y: 50 }));
		const next = issueMoveOrder(state, { x: 80, y: 50 }, map, RADIUS);
		expect(next).toBe(state);
	});
});

describe("step", () => {
	it("moves toward the next waypoint at speed * dt on land", () => {
		const state = stateOf(
			Grunt.spawn("a", "blue", { x: 90, y: 20 }).copy({
				target: { x: 190, y: 20 },
				path: [{ x: 190, y: 20 }],
			}),
		);
		// Grunt speed is 160 → 16 units in 0.1s
		const next = step(state, map, RADIUS, 0.1);
		expect(next.units[0]?.position.x).toBeCloseTo(106);
		expect(next.units[0]?.position.y).toBeCloseTo(20);
		expect(next.units[0]?.target).toEqual({ x: 190, y: 20 });
	});

	it("slows in forest via TERRAIN_SPEED_MULTIPLIER", () => {
		const state = stateOf(
			Grunt.spawn("a", "blue", { x: 40, y: 50 }).copy({
				target: { x: 100, y: 50 },
				path: [{ x: 100, y: 50 }],
			}),
		);
		// 160 * 0.7 * 0.1 = 11.2
		const next = step(state, map, RADIUS, 0.1);
		expect(next.units[0]?.position.x).toBeCloseTo(51.2);
	});

	it("clears target and path on arrival", () => {
		const state = stateOf(
			Grunt.spawn("a", "blue", { x: 50, y: 20 }).copy({
				target: { x: 55, y: 20 },
				path: [{ x: 55, y: 20 }],
			}),
		);
		const next = step(state, map, RADIUS, 0.1);
		expect(next.units[0]?.position).toEqual({ x: 55, y: 20 });
		expect(next.units[0]?.target).toBeNull();
		expect(next.units[0]?.path).toEqual([]);
	});

	it("stamps idle/marching/fighting from post-tick positions", () => {
		const idle = step(
			stateOf(Grunt.spawn("a", "blue", { x: 50, y: 50 })),
			openMap,
			RADIUS,
			0.1,
		);
		expect(idle.units[0]?.state).toBe("idle");

		const marching = step(
			stateOf(
				Grunt.spawn("a", "blue", { x: 50, y: 50 }).copy({
					target: { x: 200, y: 50 },
					path: [{ x: 200, y: 50 }],
				}),
			),
			openMap,
			RADIUS,
			0.1,
		);
		expect(marching.units[0]?.state).toBe("marching");

		const fighting = step(
			stateOf(
				Grunt.spawn("a", "blue", { x: 50, y: 50 }),
				Grunt.spawn("b", "red", { x: 60, y: 50 }),
			),
			openMap,
			RADIUS,
			0.1,
		);
		expect(fighting.units.find((u) => u.id === "a")?.state).toBe("fighting");
	});

	it("advances through waypoints", () => {
		const state = stateOf(
			Grunt.spawn("a", "blue", { x: 50, y: 20 }).copy({
				target: { x: 80, y: 20 },
				path: [
					{ x: 55, y: 20 },
					{ x: 80, y: 20 },
				],
			}),
		);
		const next = step(state, map, RADIUS, 0.1);
		expect(next.units[0]?.path).toEqual([{ x: 80, y: 20 }]);
		expect(next.units[0]?.target).toEqual({ x: 80, y: 20 });
	});
});

describe("interpolateState", () => {
	it("blends positions between ticks", () => {
		const previous = stateOf(
			Grunt.spawn("a", "blue", { x: 0, y: 0 }).copy({
				target: { x: 10, y: 0 },
				path: [{ x: 10, y: 0 }],
			}),
		);
		const current = stateOf(
			Grunt.spawn("a", "blue", { x: 10, y: 0 }).copy({
				target: { x: 10, y: 0 },
				path: [{ x: 10, y: 0 }],
			}),
		);
		const mid = interpolateState(previous, current, 0.5);
		expect(mid.units[0]?.position.x).toBeCloseTo(5);
	});
});

describe("combat", () => {
	it("finds the closest enemy in range", () => {
		const attacker = Grunt.spawn("a", "blue", { x: 0, y: 0 });
		const near = Grunt.spawn("b", "red", { x: 20, y: 0 });
		const far = Grunt.spawn("c", "red", { x: 40, y: 0 });
		expect(findClosestEnemy(attacker, [attacker, near, far], 50)?.id).toBe("b");
	});

	it("melee damages closest enemy with max(1, dmg - def)", () => {
		const blue = Grunt.spawn("a", "blue", { x: 0, y: 0 });
		const red = Grunt.spawn("b", "red", { x: 20, y: 0 });
		const result = tickCombat([blue, red], [], 0.1, 1);
		// grunt dmg 12 - def 3 = 9
		expect(result.units.find((u) => u.id === "b")?.hp).toBe(red.maxHp - 9);
		expect(result.units.find((u) => u.id === "a")?.attackTimer).toBe(
			blue.attackCooldown,
		);
	});

	it("ranged spawns a flying projectile instead of instant damage", () => {
		const archer = Archer.spawn("a", "blue", { x: 0, y: 0 });
		const red = Grunt.spawn("b", "red", { x: 100, y: 0 });
		const result = tickCombat([archer, red], [], 0.1, 1);
		expect(result.projectiles).toHaveLength(1);
		expect(result.projectiles[0]?.targetId).toBe("b");
		expect(result.units.find((u) => u.id === "b")?.hp).toBe(red.maxHp);
	});

	it("projectile applies damage on hit", () => {
		const red = Grunt.spawn("b", "red", { x: 50, y: 0 });
		const result = tickProjectiles(
			[red],
			[
				{
					id: "p1",
					teamId: "blue",
					position: { x: 45, y: 0 },
					targetId: "b",
					damage: 10,
					speed: 400,
				},
			],
			0.1,
		);
		expect(result.projectiles).toHaveLength(0);
		expect(result.units[0]?.hp).toBe(red.maxHp - Math.max(1, 10 - red.defense));
	});
});

describe("separateUnits", () => {
	it("pushes overlapping units apart", () => {
		const a = Grunt.spawn("a", "blue", { x: 100, y: 100 });
		const b = Grunt.spawn("b", "red", { x: 105, y: 100 });
		const next = separateUnits([a, b], openMap, RADIUS);
		const dx = (next[1]?.position.x ?? 0) - (next[0]?.position.x ?? 0);
		expect(Math.abs(dx)).toBeGreaterThanOrEqual(RADIUS * 2 - 0.01);
	});
});

describe("checkWinner", () => {
	it("returns the team that owns every city", () => {
		expect(
			checkWinner([
				createCity("a", "blue", { x: 0, y: 0 }, "A"),
				createCity("b", "blue", { x: 1, y: 0 }, "B"),
			]),
		).toBe("blue");
		expect(
			checkWinner([
				createCity("a", "blue", { x: 0, y: 0 }, "A"),
				createCity("b", "red", { x: 1, y: 0 }, "B"),
			]),
		).toBeNull();
		expect(checkWinner([])).toBeNull();
	});
});
