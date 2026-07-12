import { describe, expect, it } from "vitest";
import { CITY_HEAL_HP_PER_SEC, CITY_HEAL_RADIUS } from "../shared/config";
import { Grunt } from "../units";
import { createCity } from "./city";
import { collectInHealRadius, tickHealing } from "./heal";

describe("collectInHealRadius", () => {
	it("includes same-team units inside the geometric radius", () => {
		const city = createCity("c", "blue", { x: 0, y: 0 }, "N");
		const inside = Grunt.spawn("in", "blue", { x: CITY_HEAL_RADIUS - 10, y: 0 });
		const outside = Grunt.spawn("out", "blue", {
			x: CITY_HEAL_RADIUS + 20,
			y: 0,
		});
		const enemy = Grunt.spawn("e", "red", { x: 10, y: 0 });
		const ids = collectInHealRadius([city], [inside, outside, enemy]);
		expect(ids.has("in")).toBe(true);
		expect(ids.has("out")).toBe(false);
		expect(ids.has("e")).toBe(false);
	});
});

describe("tickHealing", () => {
	it("restores HP and fully refills morale", () => {
		const unit = Grunt.spawn("a", "blue", { x: 0, y: 0 }).copy({
			hp: 40,
			morale: 10,
			state: "routing",
		});
		const next = tickHealing([unit], 1, new Set(["a"]), new Set());
		expect(next[0]?.hp).toBeCloseTo(40 + CITY_HEAL_HP_PER_SEC);
		expect(next[0]?.morale).toBe(unit.maxMorale);
	});

	it("skips encircled units even if geometrically in radius", () => {
		const unit = Grunt.spawn("a", "blue", { x: 0, y: 0 }).copy({
			hp: 40,
			morale: 10,
		});
		const next = tickHealing([unit], 1, new Set(["a"]), new Set(["a"]));
		expect(next[0]?.hp).toBe(40);
		expect(next[0]?.morale).toBe(10);
	});
});
