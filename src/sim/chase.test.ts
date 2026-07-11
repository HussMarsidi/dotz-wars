import { describe, expect, it } from "vitest";
import { createFormationRegistry } from "../formation";
import type { MapDefinition } from "../map/types";
import { AGGRO_RANGE_MULTIPLIER } from "../shared/config";
import { Grunt } from "../units";
import { tickChase } from "./chase";
import { findPriorityEnemy } from "./combat";

const openMap: MapDefinition = {
	id: "open",
	width: 400,
	height: 400,
	regions: [],
};

const RADIUS = 10;

describe("findPriorityEnemy", () => {
	it("prefers the lowest HP ratio inside range", () => {
		const attacker = Grunt.spawn("a", "blue", { x: 0, y: 0 });
		const healthy = Grunt.spawn("b", "red", { x: 20, y: 0 });
		const wounded = Grunt.spawn("c", "red", { x: 25, y: 0 }).copy({
			hp: 10,
		});
		expect(
			findPriorityEnemy(attacker, [attacker, healthy, wounded], 50)?.id,
		).toBe("c");
	});

	it("ties on HP ratio by choosing the closer enemy", () => {
		const attacker = Grunt.spawn("a", "blue", { x: 0, y: 0 });
		const near = Grunt.spawn("b", "red", { x: 15, y: 0 }).copy({ hp: 20 });
		const far = Grunt.spawn("c", "red", { x: 40, y: 0 }).copy({ hp: 20 });
		expect(findPriorityEnemy(attacker, [attacker, near, far], 50)?.id).toBe(
			"b",
		);
	});
});

describe("tickChase", () => {
	it("paths toward an enemy inside aggro but outside attack range", () => {
		const blue = Grunt.spawn("a", "blue", { x: 50, y: 50 });
		const aggro = blue.attackRange * AGGRO_RANGE_MULTIPLIER;
		const red = Grunt.spawn("b", "red", {
			x: 50 + blue.attackRange + 10,
			y: 50,
		});
		expect(aggro).toBeGreaterThan(blue.attackRange + 10);

		const next = tickChase([blue, red], openMap, RADIUS);
		const chaser = next.find((unit) => unit.id === "a");
		expect(chaser?.orderKind).toBe("attack");
		expect(chaser?.target).not.toBeNull();
		expect(chaser?.path.length).toBeGreaterThan(0);
	});

	it("stops moving once inside attack range", () => {
		const blue = Grunt.spawn("a", "blue", { x: 50, y: 50 }).copy({
			target: { x: 80, y: 50 },
			path: [{ x: 80, y: 50 }],
			orderKind: "move",
		});
		const red = Grunt.spawn("b", "red", {
			x: 50 + blue.attackRange * 0.5,
			y: 50,
		});
		const next = tickChase([blue, red], openMap, RADIUS);
		const chaser = next.find((unit) => unit.id === "a");
		expect(chaser?.target).toBeNull();
		expect(chaser?.path).toEqual([]);
		expect(chaser?.orderKind).toBe("attack");
	});

	it("breaks formation membership when chasing", () => {
		const blue = Grunt.spawn("a", "blue", { x: 50, y: 50 });
		const buddy = Grunt.spawn("c", "blue", { x: 60, y: 50 });
		const red = Grunt.spawn("b", "red", {
			x: 50 + blue.attackRange + 10,
			y: 50,
		});
		const formations = createFormationRegistry();
		formations.create("line", ["a", "c"], { x: 1, y: 0 });
		expect(formations.formationForUnit("a")).toBeDefined();

		tickChase([blue, buddy, red], openMap, RADIUS, formations);
		expect(formations.formationForUnit("a")).toBeUndefined();
	});

	it("ignores enemies outside aggro", () => {
		const blue = Grunt.spawn("a", "blue", { x: 50, y: 50 });
		const red = Grunt.spawn("b", "red", {
			x: 50 + blue.attackRange * AGGRO_RANGE_MULTIPLIER + 20,
			y: 50,
		});
		const next = tickChase([blue, red], openMap, RADIUS);
		const chaser = next.find((unit) => unit.id === "a");
		expect(chaser?.target).toBeNull();
		expect(chaser?.orderKind).toBe("move");
	});
});
