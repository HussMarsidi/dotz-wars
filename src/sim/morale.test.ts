import { describe, expect, it } from "vitest";
import {
	MORALE_DRAIN_PER_SEC,
	MORALE_REGEN_PER_SEC,
	UNIT_MAX_MORALE,
} from "../shared/config";
import { Diplomat, Grunt } from "../units";
import { tickMorale } from "./morale";

describe("tickMorale", () => {
	it("does not drain morale just because an enemy is in range", () => {
		const blue = Grunt.spawn("a", "blue", { x: 0, y: 0 });
		const red = Grunt.spawn("b", "red", { x: 20, y: 0 });
		const next = tickMorale([blue, red], 1);
		expect(next[0]?.morale).toBe(UNIT_MAX_MORALE);
	});

	it("drains morale while encircled even when idle", () => {
		const unit = Grunt.spawn("a", "blue", { x: 0, y: 0 });
		const next = tickMorale([unit], 1, new Set(["a"]));
		expect(next[0]?.morale).toBeCloseTo(UNIT_MAX_MORALE - MORALE_DRAIN_PER_SEC);
	});

	it("regens morale when not encircled", () => {
		const unit = Grunt.spawn("a", "blue", { x: 0, y: 0 }).copy({
			morale: 40,
		});
		const next = tickMorale([unit], 1);
		expect(next[0]?.morale).toBeCloseTo(40 + MORALE_REGEN_PER_SEC);
	});

	it("encircled diplomats also drain (only path to routing for them)", () => {
		const diplomat = Diplomat.spawn("d", "blue", { x: 0, y: 0 });
		const next = tickMorale([diplomat], 1, new Set(["d"]));
		expect(next[0]?.morale).toBeCloseTo(UNIT_MAX_MORALE - MORALE_DRAIN_PER_SEC);
	});
});
