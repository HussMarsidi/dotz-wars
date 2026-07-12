import { describe, expect, it } from "vitest";
import { Grunt } from "../units";
import { deriveUnitState } from "./unit-state";

describe("deriveUnitState", () => {
	it("returns idle when no path and no enemy in range", () => {
		const unit = Grunt.spawn("a", "blue", { x: 0, y: 0 });
		expect(deriveUnitState(unit, [unit], new Set())).toBe("idle");
	});

	it("returns marching when unit has a path", () => {
		const unit = Grunt.spawn("a", "blue", { x: 0, y: 0 }).copy({
			target: { x: 100, y: 0 },
			path: [{ x: 100, y: 0 }],
		});
		expect(deriveUnitState(unit, [unit], new Set())).toBe("marching");
	});

	it("returns marching when locked in a formation march", () => {
		const unit = Grunt.spawn("a", "blue", { x: 0, y: 0 });
		expect(deriveUnitState(unit, [unit], new Set(["a"]))).toBe("marching");
	});

	it("returns fighting when an enemy is in attack range", () => {
		const blue = Grunt.spawn("a", "blue", { x: 0, y: 0 });
		const red = Grunt.spawn("b", "red", { x: 20, y: 0 });
		expect(deriveUnitState(blue, [blue, red], new Set())).toBe("fighting");
	});

	it("prefers fighting over marching when enemy is in range", () => {
		const blue = Grunt.spawn("a", "blue", { x: 0, y: 0 }).copy({
			target: { x: 100, y: 0 },
			path: [{ x: 100, y: 0 }],
		});
		const red = Grunt.spawn("b", "red", { x: 20, y: 0 });
		expect(deriveUnitState(blue, [blue, red], new Set())).toBe("fighting");
	});

	it("never returns routing (reserved for Step 2)", () => {
		const unit = Grunt.spawn("a", "blue", { x: 0, y: 0 });
		expect(deriveUnitState(unit, [unit], new Set())).not.toBe("routing");
	});
});
