import { describe, expect, it } from "vitest";
import { MORALE_REGEN_PER_SEC, UNIT_MAX_MORALE } from "../shared/config";
import { Diplomat, Grunt } from "../units";
import { tickMorale } from "./morale";

describe("tickMorale", () => {
	it("does not drain morale just because an enemy is in range", () => {
		const blue = Grunt.spawn("a", "blue", { x: 0, y: 0 });
		const red = Grunt.spawn("b", "red", { x: 20, y: 0 });
		const next = tickMorale([blue, red], 1);
		// Full morale + regen clamp → still max (attacking does not self-drain).
		expect(next[0]?.morale).toBe(UNIT_MAX_MORALE);
	});

	it("regens morale over time", () => {
		const unit = Grunt.spawn("a", "blue", { x: 0, y: 0 }).copy({
			morale: 40,
		});
		const next = tickMorale([unit], 1);
		expect(next[0]?.morale).toBeCloseTo(40 + MORALE_REGEN_PER_SEC);
	});

	it("diplomats also only regen (no contact drain)", () => {
		const diplomat = Diplomat.spawn("d", "blue", { x: 0, y: 0 }).copy({
			morale: 50,
		});
		const red = Grunt.spawn("b", "red", { x: 5, y: 0 });
		const next = tickMorale([diplomat, red], 1);
		expect(next[0]?.morale).toBeCloseTo(50 + MORALE_REGEN_PER_SEC);
	});
});
